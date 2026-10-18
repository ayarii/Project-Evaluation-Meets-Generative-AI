import { clampScoreToBand, criterionPoints, DEFAULT_LEVEL_BANDS } from "./lib/scoring.js";

const STORAGE_KEY = "edueval-ai-rubric:v2";
const LEGACY_STORAGE_KEY = "edueval-ai-rubric:v1";

const rubric = [
  {
    id: "tech",
    title: "1. Maîtrise technique",
    max: 40,
    criteria: [
      { id: "tech_func", title: "Fonctionnalités attendues", max: 30, bloom: "Appliquer", description: "Implémentation correcte et complète des fonctionnalités requises.", indicators: ["Toutes les fonctionnalités du cahier des charges sont présentes, testables et fonctionnelles sans erreur critique."], evidence: ["Historique Git", "Démonstration", "Tests exécutés/réussis"] },
      { id: "tech_understand", title: "Compréhension technique", max: 10, bloom: "Comprendre ? Analyser", description: "Capacité à expliquer le fonctionnement du projet et ses choix techniques.", indicators: ["Réponses précises aux questions de l'enseignant·e."], evidence: ["Soutenance orale courte", "Schéma d'architecture"] },
    ],
  },
  {
    id: "quality",
    title: "2. Performance & qualité",
    max: 30,
    criteria: [
      { id: "quality_code", title: "Qualité globale du code", max: 15, bloom: "Analyser", description: "Stabilité, lisibilité, maintenabilité et absence de bugs majeurs.", indicators: ["Code structuré et commenté."], evidence: ["Revue de code", "README", "Aucune erreur critique"] },
      { id: "quality_ux", title: "Expérience utilisateur", max: 15, bloom: "Analyser ? Créer", description: "Navigation claire et ergonomie de l'interface.", indicators: ["Cas d'erreur gérés."], evidence: ["Capture annotée", "Retour de pairs"] },
    ],
  },
  {
    id: "engagement",
    title: "3. Engagement & processus",
    max: 20,
    criteria: [
      { id: "eng_collab", title: "Outils collaboratifs", max: 8, bloom: "Appliquer ? Évaluer", description: "Progression traçable et collaboration visible.", indicators: ["Historique Git public."], evidence: ["Historique Git", "GitHub Projects"] },
      { id: "eng_autonomy", title: "Autonomie & initiative", max: 6, bloom: "Créer", description: "Recherche autonome et résolution de problèmes sans aide constante.", indicators: ["Fonctionnalités bonus."], evidence: ["Journal de bord", "Entretien oral"] },
      { id: "eng_plan", title: "Organisation & planification", max: 6, bloom: "Évaluer", description: "Structuration des tâches et gestion du temps.", indicators: ["Plan initial suivi."], evidence: ["Jalons respectés", "Journal de bord"] },
    ],
  },
  {
    id: "ai",
    title: "4. Usage de l'IA générative",
    max: 10,
    criteria: [
      { id: "ai_level", title: "Niveau d'usage de l'IA", max: 4, bloom: "Analyser", description: "Cohérence entre le niveau déclaré, l'usage observé et les livrables.", indicators: ["Niveau déclaré étayé par des preuves."], evidence: ["Captures", "Journaux de prompts", "Entretien oral"] },
      { id: "ai_justify", title: "Justification de l'usage de l'IA", max: 3, bloom: "Comprendre ? Analyser", description: "Explication du pourquoi, du quand et du comment.", indicators: ["Exemples précis."], evidence: ["Journal de bord", "README"] },
      { id: "ai_critical", title: "Esprit critique face à l'IA", max: 3, bloom: "Évaluer", description: "Vérification et correction des sorties d'IA.", indicators: ["Correction ou rejet documenté."], evidence: ["Capture avant/après", "Soutenance"] },
    ],
  },
];

function readLegacyState() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object") return parsed;
    } catch {
      localStorage.removeItem(STORAGE_KEY);
    }
  }

  const legacy = localStorage.getItem(LEGACY_STORAGE_KEY);
  if (!legacy) return emptyState();

  try {
    const parsed = JSON.parse(legacy);
    const state = parsed && typeof parsed === "object" ? parsed : emptyState();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    localStorage.removeItem(LEGACY_STORAGE_KEY);
    return state;
  } catch {
    localStorage.removeItem(LEGACY_STORAGE_KEY);
    return emptyState();
  }
}

function emptyState() {
  return {
    version: 2,
    meta: {
      projectName: "",
      mode: "",
      student: "",
      github: "",
      date: "",
      scope: [],
      teacherNotes: "",
      aiLevelDeclared: "",
      aiLevelObserved: "",
    },
    scores: {},
    notes: {},
    proofs: {},
  };
}

function loadState() {
  return readLegacyState();
}

function saveState(state) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  const status = document.querySelector("#autosaveStatus");
  if (status) status.textContent = `Enregistré à ${new Date().toLocaleTimeString("fr-FR")}`;
}

function sanitizeText(value) {
  return String(value ?? "").trim();
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function computeTotals(state) {
  const bySection = {};
  let total = 0;

  for (const section of rubric) {
    let sum = 0;
    for (const criterion of section.criteria) {
      const raw = Number(state.scores[criterion.id] ?? 0);
      sum += Math.min(Math.max(raw, 0), criterion.max);
    }
    bySection[section.id] = sum;
    total += sum;
  }

  return { bySection, total, total20: Number(((total / 100) * 20).toFixed(1)) };
}

function renderRubric(mount, state) {
  mount.innerHTML = "";
  for (const section of rubric) {
    const sectionEl = document.createElement("section");
    sectionEl.className = "section";
    sectionEl.dataset.sectionId = section.id;

    const sectionHead = document.createElement("div");
    sectionHead.className = "section-head";
    sectionHead.innerHTML = `
      <h3 class="section-title">${section.title}</h3>
      <div class="pill"><span>Total</span><strong><span data-section-total="${section.id}">0</span> / ${section.max}</strong></div>
    `;
    sectionEl.appendChild(sectionHead);

    for (const criterion of section.criteria) {
      const score = state.scores[criterion.id] ?? "";
      const note = state.notes[criterion.id] ?? "";
      const proofs = state.proofs[criterion.id] ?? [];

      const criterionEl = document.createElement("article");
      criterionEl.className = "criterion";
      criterionEl.dataset.criterionId = criterion.id;

      const proofRows = (criterion.evidence || []).map((item, index) => {
        const proof = proofs[index] ?? { status: "unchecked", url: "" };
        return `
          <div class="proof-row" data-proof-row="${criterion.id}:${index}">
            <div class="proof-main">
              <span>${escapeHtml(item)}</span>
              <select data-proof-status="${criterion.id}" data-proof-index="${index}" aria-label="Statut de la preuve ${escapeHtml(item)}">
                <option value="unchecked" ${proof.status === "unchecked" ? "selected" : ""}>À vérifier</option>
                <option value="seen" ${proof.status === "seen" ? "selected" : ""}>Vue</option>
                <option value="absent" ${proof.status === "absent" ? "selected" : ""}>Absente</option>
              </select>
            </div>
            <label class="field proof-link">
              <span>Lien</span>
              <input type="url" data-proof-url="${criterion.id}" data-proof-index="${index}" value="${escapeHtml(proof.url || "")}" placeholder="https://..." />
            </label>
          </div>
        `;
      }).join("");

      criterionEl.innerHTML = `
        <div class="criterion-head">
          <div>
            <h4 class="criterion-title">${criterion.title}</h4>
            <div class="small muted">${section.title}</div>
          </div>
          <div class="criterion-meta">
            <span class="tag tag-bloom">Bloom : ${criterion.bloom}</span>
            <span class="tag tag-max">Max : ${criterion.max} pts</span>
          </div>
        </div>
        <div class="criterion-grid">
          <div class="desc">
            <div><b>Description :</b> ${criterion.description}</div>
            <div style="margin-top:8px"><b>Indicateurs :</b></div>
            <ul>${(criterion.indicators || []).map((item) => `<li>${item}</li>`).join("")}</ul>
            <div style="margin-top:8px"><b>Preuves attendues :</b></div>
            <div class="proof-list">${proofRows}</div>
          </div>
          <div class="inputs">
            <div class="score-input">
              <div>
                <div class="label2">Score</div>
                <div class="small muted">0 à ${criterion.max}</div>
              </div>
              <input type="number" inputmode="numeric" min="0" max="${criterion.max}" step="0.5" value="${score === "" ? "" : Number(score)}" data-score-input="${criterion.id}" aria-label="Score pour ${escapeHtml(criterion.title)}" />
            </div>
            <label class="field">
              <span>Observations (critère)</span>
              <textarea rows="3" data-note-input="${criterion.id}" placeholder="Notes / justifications…">${escapeHtml(note)}</textarea>
            </label>
          </div>
        </div>
      `;
      sectionEl.appendChild(criterionEl);
    }
    mount.appendChild(sectionEl);
  }
}

function renderIaScale(mount) {
  const rows = [
    ["N1", "Sans IA", "Aucun outil d'IA utilisé.", "Déclaration écrite + aucune mention d'IA dans le journal de bord."],
    ["N2", "Préparation avec IA", "IA utilisée pour l'idéation et la recherche.", "Captures de prompts de recherche ; pré-rédaction."],
    ["N3", "Collaboration avec IA", "IA comme assistant pour le code ou le texte.", "Journal des échanges IA ; corrections apportées."],
    ["N4", "Intégration complète", "IA intégrée à chaque étape.", "Pipeline détaillé ; exemples de rejet/correction de réponses IA."],
    ["N5", "Exploration créative", "IA utilisée de façon innovante et réflexive.", "Rapport réflexif ; expérimentations documentées."],
  ];

  mount.innerHTML = `
    <div class="ia-table-wrap" role="region" aria-label="Table indicative de l'échelle d'usage de l'IA">
      <table class="ia-table">
        <thead><tr><th>Niveau</th><th>Libellé</th><th>Comportements observables</th><th>Preuves attendues</th></tr></thead>
        <tbody>${rows.map((row) => `<tr><td class="level">${row[0]}</td><td class="label">${row[1]}</td><td>${row[2]}</td><td>${row[3]}</td></tr>`).join("")}</tbody>
      </table>
    </div>
  `;
}

function updateTotalsUI(state) {
  const totals = computeTotals(state);
  for (const section of rubric) {
    const subtotal = totals.bySection[section.id] ?? 0;
    const node = document.querySelector(`[data-section-total="${section.id}"]`);
    if (node) node.textContent = String(subtotal);
  }

  const totalNode = document.querySelector("#totalScore");
  if (totalNode) totalNode.textContent = String(totals.total);

  const total20Node = document.querySelector("#totalScore20");
  if (total20Node) total20Node.textContent = String(totals.total20);

  const progress = document.querySelector("#totalProgress");
  const meter = document.querySelector(".progress");
  if (progress) progress.style.width = `${Math.min(totals.total, 100)}%`;
  if (meter) meter.setAttribute("aria-valuenow", String(totals.total));
}

function hydrateMeta(state) {
  const form = document.querySelector("#metaForm");
  if (!form) return;
  const setValue = (name, value) => {
    const control = form.querySelector(`[name="${name}"]`);
    if (control && "value" in control) control.value = String(value ?? "");
  };
  setValue("projectName", state.meta.projectName);
  setValue("mode", state.meta.mode);
  setValue("student", state.meta.student);
  setValue("github", state.meta.github);
  setValue("date", state.meta.date);
  setValue("aiLevelDeclared", state.meta.aiLevelDeclared);
  setValue("aiLevelObserved", state.meta.aiLevelObserved);
  form.querySelectorAll('input[name="scope"]').forEach((box) => {
    box.checked = Array.isArray(state.meta.scope) && state.meta.scope.includes(box.value);
  });
  const notes = document.querySelector("#teacherNotes");
  if (notes) notes.value = state.meta.teacherNotes ?? "";
}

function ensureProofs(state) {
  for (const criterion of rubric.flatMap((section) => section.criteria)) {
    const list = state.proofs[criterion.id] ?? [];
    const mapped = (criterion.evidence || []).map((_, index) => ({
      status: list[index]?.status ?? "unchecked",
      url: list[index]?.url ?? "",
    }));
    state.proofs[criterion.id] = mapped;
  }
}

function resetForm(state) {
  Object.assign(state, emptyState());
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  hydrateMeta(state);
  renderRubric(document.querySelector("#rubricMount"), state);
  updateTotalsUI(state);
  const status = document.querySelector("#autosaveStatus");
  if (status) status.textContent = "Formulaire réinitialisé — prêt pour la prochaine évaluation";
}

function downloadJson(state) {
  const payload = {
    exportedAt: new Date().toISOString(),
    type: "ponderee",
    meta: state.meta,
    scores: state.scores,
    notes: state.notes,
    proofs: state.proofs,
    totals: computeTotals(state),
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  const project = (state.meta.projectName || "grille-ponderee").replace(/\s+/g, "_") || "grille-ponderee";
  link.download = `${project}_${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function exportCsv(state) {
  const rows = [
    ["Projet", state.meta.projectName ?? ""],
    ["Mode", state.meta.mode ?? ""],
    ["Étudiant·e(s)", state.meta.student ?? ""],
    ["Lien GitHub", state.meta.github ?? ""],
    ["Date", state.meta.date ?? ""],
    ["Périmètre", (state.meta.scope ?? []).join(" | ")],
    ["Niveau IA déclaré", state.meta.aiLevelDeclared ?? ""],
    ["Niveau IA observé", state.meta.aiLevelObserved ?? ""],
    ["Observations", state.meta.teacherNotes ?? ""],
    [],
    ["Axe", "Critère", "Score", "Max", "Observations"],
  ];
  for (const section of rubric) {
    for (const criterion of section.criteria) {
      rows.push([section.title, criterion.title, state.scores[criterion.id] ?? "", criterion.max, state.notes[criterion.id] ?? ""]);
    }
  }
  const csv = rows.map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  const project = (state.meta.projectName || "grille-ponderee").replace(/\s+/g, "_") || "grille-ponderee";
  link.download = `${project}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function downloadExcel(state) {
  const XLSX = globalThis.XLSX;
  if (!XLSX) {
    exportCsv(state);
    return false;
  }

  const wb = XLSX.utils.book_new();
  const summaryRows = [
    ["Axe", "Score", "Max"],
    ["Maîtrise technique", state.scores.tech_func ?? 0, 30],
    ["Performance & qualité", state.scores.quality_code ?? 0, 15],
    ["Engagement", state.scores.eng_collab ?? 0, 8],
    ["Usage IA", state.scores.ai_level ?? 0, 4],
    ["TOTAL (/100)", computeTotals(state).total, 100],
    ["TOTAL (/20)", computeTotals(state).total20, 20],
  ];
  const wsSummary = XLSX.utils.aoa_to_sheet(summaryRows);
  wsSummary["!cols"] = [{ wch: 28 }, { wch: 12 }, { wch: 8 }];
  XLSX.utils.book_append_sheet(wb, wsSummary, "Synthèse");

  const detailRows = [["Axe", "Critère", "Score", "Max", "Observations", "Preuves", "Statuts"]];
  for (const section of rubric) {
    for (const criterion of section.criteria) {
      const proofStatuses = (state.proofs[criterion.id] || []).map((proof, idx) => `${criterion.evidence[idx] ?? "preuve"}: ${proof.status || "unchecked"}`).join(" | ");
      detailRows.push([section.title, criterion.title, state.scores[criterion.id] ?? "", criterion.max, state.notes[criterion.id] ?? "", (criterion.evidence || []).join(" | "), proofStatuses]);
    }
  }
  const wsDetail = XLSX.utils.aoa_to_sheet(detailRows);
  wsDetail["!cols"] = [{ wch: 24 }, { wch: 30 }, { wch: 10 }, { wch: 8 }, { wch: 26 }, { wch: 28 }, { wch: 28 }];
  XLSX.utils.book_append_sheet(wb, wsDetail, "Détails");

  const project = (state.meta.projectName || "grille-ponderee").replace(/\s+/g, "_") || "grille-ponderee";
  XLSX.writeFile(wb, `${project}_${new Date().toISOString().slice(0, 10)}.xlsx`);
  return true;
}

function promptAfterExport(state) {
  const shouldReset = window.confirm("Export réussi. Voulez-vous garder l'évaluation ou démarrer une nouvelle évaluation ?\nOK = nouvelle évaluation\nAnnuler = garder");
  if (shouldReset) resetForm(state);
}

function bindInteractions(state) {
  const form = document.querySelector("#metaForm");
  const notes = document.querySelector("#teacherNotes");

  if (form) {
    form.addEventListener("input", () => {
      const fd = new FormData(form);
      state.meta.projectName = sanitizeText(fd.get("projectName"));
      state.meta.mode = sanitizeText(fd.get("mode"));
      state.meta.student = sanitizeText(fd.get("student"));
      state.meta.github = sanitizeText(fd.get("github"));
      state.meta.date = sanitizeText(fd.get("date"));
      state.meta.aiLevelDeclared = sanitizeText(fd.get("aiLevelDeclared"));
      state.meta.aiLevelObserved = sanitizeText(fd.get("aiLevelObserved"));
      state.meta.scope = Array.from(form.querySelectorAll('input[name="scope"]:checked')).map((item) => item.value);
      saveState(state);
    });
  }

  if (notes) {
    notes.addEventListener("input", () => {
      state.meta.teacherNotes = notes.value;
      saveState(state);
    });
  }

  document.addEventListener("input", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;

    if (target.matches("[data-score-input]")) {
      const id = target.getAttribute("data-score-input");
      const criterion = rubric.flatMap((section) => section.criteria).find((item) => item.id === id);
      if (!criterion) return;
      const value = target.value;
      state.scores[id] = value === "" ? "" : clampScoreToBand("A", Number(value), DEFAULT_LEVEL_BANDS);
      updateTotalsUI(state);
      saveState(state);
    }

    if (target.matches("[data-note-input]")) {
      const id = target.getAttribute("data-note-input");
      if (!id) return;
      state.notes[id] = target.value;
      saveState(state);
    }

    if (target.matches("[data-proof-status]")) {
      const criterionId = target.getAttribute("data-proof-status");
      const index = Number(target.getAttribute("data-proof-index"));
      if (!criterionId || Number.isNaN(index)) return;
      if (!state.proofs[criterionId]) state.proofs[criterionId] = [];
      state.proofs[criterionId][index] = { ...(state.proofs[criterionId][index] ?? {}), status: target.value };
      saveState(state);
    }

    if (target.matches("[data-proof-url]")) {
      const criterionId = target.getAttribute("data-proof-url");
      const index = Number(target.getAttribute("data-proof-index"));
      if (!criterionId || Number.isNaN(index)) return;
      const value = target.value.trim();
      if (value && !/^https?:\/\//i.test(value)) {
        target.setCustomValidity("URL invalide : utilisez uniquement http:// ou https://");
        target.reportValidity();
      } else {
        target.setCustomValidity("");
      }
      if (!state.proofs[criterionId]) state.proofs[criterionId] = [];
      state.proofs[criterionId][index] = { ...(state.proofs[criterionId][index] ?? {}), url: value };
      saveState(state);
    }
  });

  document.addEventListener("blur", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement) || !target.matches("[data-score-input]")) return;
    const id = target.getAttribute("data-score-input");
    const criterion = rubric.flatMap((section) => section.criteria).find((item) => item.id === id);
    if (!criterion) return;
    const raw = target.value;
    if (raw === "") {
      state.scores[id] = "";
      updateTotalsUI(state);
      saveState(state);
      return;
    }
    const numeric = Math.min(Math.max(Number(raw), 0), criterion.max);
    state.scores[id] = numeric;
    target.value = String(numeric);
    updateTotalsUI(state);
    saveState(state);
  }, true);

  document.querySelector("#btnSubmit")?.addEventListener("click", () => {
    downloadJson(state);
    promptAfterExport(state);
  });

  document.querySelector("#btnExport")?.addEventListener("click", () => {
    downloadJson(state);
    promptAfterExport(state);
  });

  document.querySelector("#btnExcel")?.addEventListener("click", () => {
    if (downloadExcel(state)) promptAfterExport(state);
  });

  document.querySelector("#btnPrint")?.addEventListener("click", () => window.print());
  document.querySelector("#btnPdf")?.addEventListener("click", () => window.print());

  document.querySelector("#btnReset")?.addEventListener("click", () => {
    const ok = window.confirm("Réinitialiser toutes les données (scores, champs, observations) ?");
    if (!ok) return;
    resetForm(state);
  });
}

function main() {
  const state = loadState();
  ensureProofs(state);
  const mount = document.querySelector("#rubricMount");
  const iaMount = document.querySelector("#iaScaleMount");
  hydrateMeta(state);
  if (mount) renderRubric(mount, state);
  if (iaMount) renderIaScale(iaMount);
  updateTotalsUI(state);
  bindInteractions(state);
}

document.addEventListener("DOMContentLoaded", main);
