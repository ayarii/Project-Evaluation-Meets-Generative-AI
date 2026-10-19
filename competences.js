import { DEFAULT_LEVEL_BANDS, LEVELS, NOTE_STEP, computeCompetenceTotals, levelPointsInterval, normalizeNote } from "./lib/scoring.js";
import { migrateCompetences } from "./lib/migrate.js";
import { writeStoredState, STORAGE_KEYS } from "./storage.js";
import { buildCompetenceExport } from "./lib/competence-export.js";

(() => {
  const STORAGE_KEY = STORAGE_KEYS.competencesV3;

  const LEVEL_LABELS = { A: "Excellent", B: "Maîtrisé", C: "En cours d'acquisition", D: "Non acquis" };

  const rubric = [
    { id: "tech", title: "1. Maîtrise technique", max: 40, criteria: [
      { id: "tech_func", title: "Fonctionnalités attendues", max: 30, levels: { A: "Toutes les fonctionnalités du cahier des charges sont implémentées, testées et fonctionnent sans erreur bloquante.", B: "Toutes les fonctionnalités attendues sont présentes et opérationnelles ; quelques erreurs mineures ponctuelles.", C: "La majorité des fonctionnalités sont présentes mais certaines restent incomplètes ou instables.", D: "Des fonctionnalités majeures sont absentes ou non fonctionnelles ; le projet ne démarre pas ou plante." } },
      { id: "tech_understand", title: "Compréhension technique / architecture", max: 10, levels: { A: "Explique avec précision l'ensemble des choix techniques et l'architecture ; justifie des alternatives possibles.", B: "Explique correctement le fonctionnement et les choix principaux du projet.", C: "Décrit le projet de façon générale mais peine à justifier les choix techniques ou l'architecture.", D: "Ne peut pas expliquer le fonctionnement du projet ou attribue le code à une source externe sans démontrer la compréhension." } }
    ] },
    { id: "quality", title: "2. Performance & qualité", max: 30, criteria: [
      { id: "quality_code", title: "Qualité globale du code et du projet", max: 15, levels: { A: "Code structuré en modules réutilisables, lisible, sans erreur en production.", B: "Code globalement propre et lisible ; quelques erreurs mineures non bloquantes.", C: "Code fonctionnel mais désorganisé ou peu commenté.", D: "Code difficile à lire, erreurs bloquantes constatées en production." } },
      { id: "quality_ux", title: "UX / UI", max: 15, levels: { A: "Interface fluide et intuitive ; tous les cas d'erreur sont gérés.", B: "Navigation logique et ergonomique ; la majorité des cas d'usage courants sont couverts.", C: "Interface utilisable mais confuse par endroits ; certains cas d'erreur ne sont pas gérés.", D: "Interface peu compréhensible, navigation incohérente, blocages fréquents." } }
    ] },
    { id: "engagement", title: "3. Engagement & processus", max: 20, criteria: [
      { id: "eng_collab", title: "Outils collaboratifs (Git, GitHub Projects…)", max: 8, levels: { A: "Commits réguliers à chaque session, messages clairs et descriptifs, usage de branches/PR.", B: "Commits réguliers avec des messages globalement clairs ; usage correct des fonctionnalités de base de Git.", C: "Commits rares ou peu descriptifs ; usage minimal des fonctionnalités collaboratives.", D: "Un seul commit final ou absence d'historique exploitable." } },
      { id: "eng_autonomy", title: "Autonomie & initiative", max: 6, levels: { A: "Résout des problèmes non spécifiés dans le cahier des charges ; propose et développe des idées personnelles.", B: "Avance de façon autonome sur les tâches prévues, avec peu de sollicitation de l'enseignant.", C: "A besoin d'un accompagnement régulier pour avancer sur les tâches.", D: "Ne progresse pas sans intervention directe et continue de l'enseignant." } },
      { id: "eng_plan", title: "Organisation & planification", max: 6, levels: { A: "Plan initial suivi et ajusté avec pertinence ; jalons respectés.", B: "Organisation globalement respectée ; quelques ajustements mineurs.", C: "Organisation présente mais peu suivie dans les faits ; retards ponctuels.", D: "Absence de planification visible ; travail réalisé dans l'urgence." } }
    ] },
    { id: "ai", title: "4. Usage de l'IA générative", max: 10, criteria: [
      { id: "ai_level", title: "Niveau d'usage de l'IA (échelle N1–N5)", hint: "Ce critère évalue la cohérence entre le niveau N déclaré et les preuves observées — pas le niveau N lui-même.", max: 4, levels: { A: "Le niveau déclaré est pleinement cohérent avec les preuves fournies.", B: "Le niveau déclaré est globalement cohérent avec les preuves fournies, avec de légers écarts mineurs.", C: "Le niveau déclaré est partiellement étayé ; certaines preuves manquent ou sont peu convaincantes.", D: "Aucune preuve d'usage fournie, ou incohérence marquée entre le niveau déclaré et l'usage réellement observé." } },
      { id: "ai_justify", title: "Justification de l'usage de l'IA", max: 3, levels: { A: "Explique précisément pourquoi, quand et comment l'IA a été utilisée, avec des exemples concrets.", B: "Justifie l'usage de l'IA de façon correcte mais assez générale.", C: "La justification est vague ou se limite à une déclaration générale.", D: "Aucune justification fournie, ou usage de l'IA non mentionné alors qu'il est observable dans le rendu." } },
      { id: "ai_critical", title: "Esprit critique face à l'IA", max: 3, levels: { A: "Au moins un exemple documenté de correction ou de rejet d'une proposition de l'IA, avec analyse des limites ou biais identifiés.", B: "Mentionne avoir vérifié ou ajusté les sorties de l'IA, sans documentation détaillée du processus.", C: "Accepte largement les sorties de l'IA sans les questionner, avec de rares nuances.", D: "Aucune trace d'esprit critique ; les sorties de l'IA sont reprises telles quelles." } }
    ] }
  ];

  const iaScale = [
    { level: "N1", label: "Sans IA", behaviors: "Aucun outil d'IA utilisé. L'étudiant·e travaille uniquement avec des ressources humaines et la documentation standard.", evidence: "Déclaration écrite + aucune mention d'IA dans le journal de bord." },
    { level: "N2", label: "Préparation avec IA", behaviors: "IA utilisée pour l'idéation, la recherche, le brainstorming. L'étudiant·e réécrit ensuite avec ses propres mots.", evidence: "Captures de prompts de recherche ; sections de pré-rédaction dans le journal de bord." },
    { level: "N3", label: "Collaboration avec IA", behaviors: "IA comme assistant : génération de code, amélioration de texte, correction. L'étudiant·e relit et ajuste chaque sortie.", evidence: "Journal des échanges IA (ChatGPT, Copilot…) ; éléments montrant l'origine IA et les corrections apportées." },
    { level: "N4", label: "Intégration complète", behaviors: "IA intégrée à chaque étape. L'étudiant·e orchestre les outils, choisit les modèles et évalue les limites.", evidence: "Pipeline détaillé (quel outil, à quelle étape) ; exemples de sorties IA rejetées/corrigées ; soutenance orale." },
    { level: "N5", label: "Exploration créative", behaviors: "IA utilisée de façon innovante et réflexive. L'étudiant·e questionne les biais, documente les expérimentations, crée de nouveaux usages.", evidence: "Rapport réflexif sur l'usage de l'IA ; expérimentations documentées ; exemples de détournements créatifs ou critiques." },
  ];

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));

  function emptyState() {
    return {
      version: 3,
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
      criteria: {},
      notes: {},
    };
  }

  function loadState() {
    for (const key of [STORAGE_KEY, STORAGE_KEYS.competencesV2, STORAGE_KEYS.competencesV1]) {
      const raw = localStorage.getItem(key);
      if (!raw) continue;
      let parsed;
      try {
        parsed = JSON.parse(raw);
      } catch {
        localStorage.removeItem(key);
        continue;
      }
      const state = migrateCompetences(parsed);
      writeStoredState(STORAGE_KEY, state);
      if (key !== STORAGE_KEY) localStorage.removeItem(key);
      return state;
    }

    return emptyState();
  }

  function saveState(state) {
    writeStoredState(STORAGE_KEY, state);
    const el = $("#autosaveStatus");
    if (el) el.textContent = `Enregistré à ${new Date().toLocaleTimeString("fr-FR")}`;
  }

  function allCriteria() {
    return rubric.flatMap((section) => section.criteria);
  }

  function escapeHtml(str) {
    return String(str)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function formatNumber(value) {
    return new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 1 }).format(value);
  }

  function rangeText(range) {
    return `${formatNumber(range.min)}–${formatNumber(range.max)} pts`;
  }

  function computeTotals(state) {
    return computeCompetenceTotals(rubric, state.criteria, DEFAULT_LEVEL_BANDS);
  }

  function renderRubric(mount, state) {
    const totals = computeTotals(state);
    mount.innerHTML = "";

    for (const section of rubric) {
      const sectionEl = document.createElement("section");
      sectionEl.className = "section";
      sectionEl.dataset.sectionId = section.id;

      const head = document.createElement("div");
      head.className = "section-head";
      head.innerHTML = `
        <h3 class="section-title">${section.title}</h3>
        <div class="section-totals" aria-live="polite">
          <span>Somme des notes : <strong data-section-points="${section.id}">${formatNumber(totals.bySection[section.id].points)}</strong> / ${formatNumber(section.max)}</span>
          <span>Intervalle de l’axe : <strong data-section-range="${section.id}">${rangeText(totals.bySection[section.id].range)}</strong></span>
          <span class="small muted" data-section-count="${section.id}">${totals.bySection[section.id].levelCount} critère(s) sur ${section.criteria.length}</span>
        </div>
      `;
      sectionEl.appendChild(head);

      for (const criterion of section.criteria) {
        const criterionState = state.criteria[criterion.id] ?? {};
        const selected = LEVELS.includes(criterionState.level) ? criterionState.level : "";
        const assignedNote = criterionState.note ?? "";
        const observation = state.notes[criterion.id] ?? "";
        const interval = selected ? levelPointsInterval(criterion.max, selected, DEFAULT_LEVEL_BANDS) : null;
        const criterionResult = totals.byCriterion[criterion.id];

        const criterionEl = document.createElement("article");
        criterionEl.className = "criterion";
        criterionEl.dataset.criterionId = criterion.id;

        const hintHtml = criterion.hint ? `<p class="small muted comp-hint">${escapeHtml(criterion.hint)}</p>` : "";
        const levelButtons = LEVELS.map((level) => `
          <button type="button" class="level-btn lvl-${level.toLowerCase()}${selected === level ? " is-selected" : ""}" data-level-btn="${criterion.id}" data-level="${level}" aria-pressed="${selected === level ? "true" : "false"}" title="${LEVEL_LABELS[level]}">
            <span class="level-btn-letter">${level}</span>
            <span class="level-btn-label">${LEVEL_LABELS[level]}</span>
          </button>
        `).join("");

        const descriptor = selected
          ? `<div class="level-descriptor lvl-${selected.toLowerCase()}"><strong>Niveau ${selected} — ${LEVEL_LABELS[selected]}</strong><p>${escapeHtml(criterion.levels[selected])}</p></div>`
          : `<div class="level-descriptor level-descriptor-empty small muted">Sélectionnez un niveau A, B, C ou D pour afficher le descripteur correspondant.</div>`;
        const intervalDescription = selected
          ? `<p class="criterion-interval" data-criterion-interval="${criterion.id}" aria-live="polite">Niveau ${selected} : ${DEFAULT_LEVEL_BANDS[selected].min}–${DEFAULT_LEVEL_BANDS[selected].max} % soit ${formatNumber(interval.min)} à ${formatNumber(interval.max)} pts (sur ${formatNumber(criterion.max)}).</p>`
          : `<p class="criterion-interval small muted" data-criterion-interval="${criterion.id}" aria-live="polite">Choisissez un niveau pour afficher son intervalle.</p>`;
        const positionText = criterionResult.position === "below"
          ? "↓ Sous l’intervalle"
          : criterionResult.position === "above"
            ? "↑ Au-dessus de l’intervalle"
            : criterionResult.position === "inside"
              ? "✓ Dans l’intervalle"
              : "";

        criterionEl.innerHTML = `
          <div class="criterion-head">
            <div>
              <h4 class="criterion-title">${criterion.title}</h4>
              <div class="small muted">${section.title}</div>
              ${hintHtml}
            </div>
            <div class="criterion-meta">
              <span class="tag tag-max">Poids : ${criterion.max} pts</span>
            </div>
          </div>

          <div class="level-picker" role="group" aria-label="Niveau pour ${escapeHtml(criterion.title)}">
            ${levelButtons}
          </div>

          ${descriptor}

          ${intervalDescription}

          <div class="assigned-note">
            <label class="field" for="assigned-note-${criterion.id}">
              <span>Note attribuée (/${formatNumber(criterion.max)})</span>
              <input id="assigned-note-${criterion.id}" type="number" min="0" max="${criterion.max}" step="${NOTE_STEP}" data-assigned-note="${criterion.id}" value="${assignedNote === "" ? "" : escapeHtml(assignedNote)}" placeholder="${selected && assignedNote === "" ? "Note à saisir" : "—"}" aria-describedby="note-position-${criterion.id}" />
            </label>
            <span class="note-position" id="note-position-${criterion.id}" data-note-position="${criterion.id}" aria-live="polite">${positionText}</span>
          </div>

          <label class="field comp-note-field">
            <span>Observations (critère)</span>
            <textarea rows="2" data-note-input="${criterion.id}" placeholder="Notes / justifications…">${escapeHtml(observation)}</textarea>
          </label>
        `;

        sectionEl.appendChild(criterionEl);
      }

      mount.appendChild(sectionEl);
    }
  }

  function renderReferenceTable(mount) {
    const rows = rubric.flatMap((section) =>
      section.criteria.map((criterion, index) => {
        const axeCell = index === 0 ? `<td class="axe-cell" rowspan="${section.criteria.length}">${section.title}</td>` : "";
        if (index > 0) {
          return `<tr><td class="crit-cell">${criterion.title}<span class="max">/${criterion.max} pts</span></td>${LEVELS.map((level) => `<td class="lvl-${level.toLowerCase()}">${escapeHtml(criterion.levels[level])}</td>`).join("")}</tr>`;
        }

        return `<tr>${axeCell}<td class="crit-cell">${criterion.title}<span class="max">/${criterion.max} pts</span></td>${LEVELS.map((level) => `<td class="lvl-${level.toLowerCase()}">${escapeHtml(criterion.levels[level])}</td>`).join("")}</tr>`;
      })
    ).join("");

    mount.innerHTML = `
      <div class="comp-table-wrap" role="region" aria-label="Référentiel complet des niveaux">
        <table class="comp-table">
          <thead>
            <tr>
              <th>Axe</th>
              <th>Sous-critère</th>
              <th>A — Excellent</th>
              <th>B — Maîtrisé</th>
              <th>C — En cours d'acquisition</th>
              <th>D — Non acquis</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    `;
  }

  function renderIaScale(mount) {
    mount.innerHTML = `
      <div class="ia-table-wrap" role="region" aria-label="Échelle indicative d'usage de l'IA">
        <table class="ia-table">
          <thead>
            <tr>
              <th>Niveau</th>
              <th>Libellé</th>
              <th>Comportements observables</th>
              <th>Preuves attendues</th>
            </tr>
          </thead>
          <tbody>
            ${iaScale.map((row, index) => `
              <tr class="ia-row-n${index + 1}">
                <td class="level">${row.level}</td>
                <td class="label">${row.label}</td>
                <td>${row.behaviors}</td>
                <td>${row.evidence}</td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      </div>
    `;
  }

  function updateTotalsUI(state) {
    const totals = computeTotals(state);

    for (const section of rubric) {
      const sectionTotals = totals.bySection[section.id];
      const pointsNode = document.querySelector(`[data-section-points="${section.id}"]`);
      const rangeNode = document.querySelector(`[data-section-range="${section.id}"]`);
      const countNode = document.querySelector(`[data-section-count="${section.id}"]`);
      if (pointsNode) pointsNode.textContent = formatNumber(sectionTotals.points);
      if (rangeNode) rangeNode.textContent = sectionTotals.levelCount ? rangeText(sectionTotals.range) : "—";
      if (countNode) countNode.textContent = `${sectionTotals.levelCount} critère(s) sur ${section.criteria.length}`;
    }

    const filledEl = $("#levelsFilled");
    if (filledEl) filledEl.textContent = `${totals.evaluatedCount} / ${totals.totalCriteria}`;

    const totalScore = $("#totalScore");
    const totalScore20 = $("#totalScore20");
    const scoreHint = $("#scoreHint");
    const totalLabel = $("#totalLabel");
    const totalRange = $("#totalRange");
    const exportWarning = $("#exportWarning");
    const migrationNotice = $("#migrationNotice");

    if (totalScore) totalScore.textContent = formatNumber(totals.points);
    if (totalScore20) totalScore20.textContent = totals.complete ? formatNumber(totals.on20) : "—";
    if (totalLabel) totalLabel.textContent = totals.complete ? "Total" : "Total partiel";
    if (scoreHint) scoreHint.textContent = `${totals.evaluatedCount} critère(s) évalué(s) sur ${totals.totalCriteria}`;
    if (totalRange) totalRange.textContent = totals.levelCount ? `Fourchette des niveaux : ${rangeText(totals.rangePoints)}` : "Fourchette des niveaux : —";
    if (exportWarning) exportWarning.hidden = totals.complete;
    if (migrationNotice) {
      migrationNotice.hidden = !Object.values(state.criteria).some((criterion) => criterion?.level && criterion.note == null);
    }

    const progress = $("#totalProgress");
    const bar = $(".progress");
    const percent = totals.totalCriteria ? (totals.evaluatedCount / totals.totalCriteria) * 100 : 0;
    if (progress) progress.style.width = `${percent}%`;
    if (bar) bar.setAttribute("aria-valuenow", String(Math.round(percent)));

    for (const [criterionId, criterionTotals] of Object.entries(totals.byCriterion)) {
      const positionNode = document.querySelector(`[data-note-position="${criterionId}"]`);
      if (!positionNode) continue;
      positionNode.textContent = criterionTotals.position === "below"
        ? "↓ Sous l’intervalle"
        : criterionTotals.position === "above"
          ? "↑ Au-dessus de l’intervalle"
          : criterionTotals.position === "inside"
            ? "✓ Dans l’intervalle"
            : "";
    }
  }

  function hydrateMeta(state) {
    const metaForm = $("#metaForm");
    if (metaForm) {
      const setValue = (name, value) => {
        const el = $(`[name="${name}"]`, metaForm);
        if (el && "value" in el) el.value = String(value ?? "");
      };

      setValue("projectName", state.meta.projectName);
      setValue("mode", state.meta.mode);
      setValue("student", state.meta.student);
      setValue("github", state.meta.github);
      setValue("date", state.meta.date);
      setValue("aiLevelDeclared", state.meta.aiLevelDeclared);
      setValue("aiLevelObserved", state.meta.aiLevelObserved);

      const scopes = new Set(state.meta.scope ?? []);
      $$('input[name="scope"]', metaForm).forEach((cb) => {
        cb.checked = scopes.has(cb.value);
      });
    }

    const teacherNotes = $("#teacherNotes");
    if (teacherNotes) teacherNotes.value = state.meta.teacherNotes ?? "";
  }

  function resetForm(state) {
    const mount = $("#rubricMount");
    const fresh = emptyState();
    state.meta = fresh.meta;
    state.version = fresh.version;
    state.criteria = fresh.criteria;
    state.notes = fresh.notes;
    writeStoredState(STORAGE_KEY, state);
    hydrateMeta(state);
    if (mount) renderRubric(mount, state);
    updateTotalsUI(state);

    const el = $("#autosaveStatus");
    if (el) el.textContent = "Formulaire réinitialisé — prêt pour la prochaine évaluation";
  }

  function downloadJson(state) {
    const payload = buildCompetenceExport(rubric, state, DEFAULT_LEVEL_BANDS);
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    const base = (state.meta.projectName || "grille-competences").trim().replaceAll(/\s+/g, "_");
    link.download = `${base || "grille-competences"}_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  function downloadCsv(state) {
    const totals = computeTotals(state);
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
      ["Axe", "Critère", "Niveau", "Note attribuée", "Poids max", "Statut", "Intervalle indicatif", "Observations"],
    ];

    for (const section of rubric) {
      for (const criterion of section.criteria) {
        const result = totals.byCriterion[criterion.id];
        rows.push([
          section.title,
          criterion.title,
          result.level ?? "",
          result.note ?? "",
          criterion.max,
          result.status,
          result.interval ? rangeText(result.interval) : "",
          state.notes[criterion.id] ?? "",
        ]);
      }
    }

    rows.push([], ["Total partiel", totals.points, "Fourchette", rangeText(totals.rangePoints), "Complet", totals.complete ? "Oui" : "Non", "Total /20", totals.on20 ?? ""]);
    const csv = rows.map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${(state.meta.projectName || "grille-competences").replace(/\s+/g, "_") || "grille-competences"}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  function downloadExcel(state) {
    const XLSX = globalThis.XLSX;
    if (!XLSX) {
      downloadCsv(state);
      return false;
    }

    const totals = computeTotals(state);
    const wb = XLSX.utils.book_new();
    const summaryRows = [
      ["Axe", "Somme des notes", "Intervalle indicatif", "Critères évalués", "Critères avec niveau", "Max", "Total /100", "Total /20", "Fourchette /20"],
      ...rubric.map((section) => {
        const summary = totals.bySection[section.id];
        return [
          section.title,
          summary.points,
          rangeText(summary.range),
          `${summary.evaluated}/${section.criteria.length}`,
          `${summary.levelCount}/${section.criteria.length}`,
          section.max,
          "",
          "",
          "",
        ];
      }),
      ["TOTAL", totals.points, rangeText(totals.rangePoints), `${totals.evaluatedCount}/${totals.totalCriteria}`, `${totals.levelCount}/${totals.totalCriteria}`, totals.totalMax, totals.on100 ?? "—", totals.on20 ?? "—", totals.range20 ? rangeText(totals.range20) : "—"],
    ];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(summaryRows), "Synthèse");

    const detailRows = [["Axe", "Critère", "Niveau", "Note attribuée", "Poids max", "Statut", "Intervalle min", "Intervalle max", "Position", "Descripteur", "Observations"]];
    for (const section of rubric) {
      for (const criterion of section.criteria) {
        const result = totals.byCriterion[criterion.id];
        detailRows.push([
          section.title,
          criterion.title,
          result.level ?? "",
          result.note ?? "",
          criterion.max,
          result.status,
          result.interval?.min ?? "",
          result.interval?.max ?? "",
          result.position ?? "",
          result.level ? criterion.levels[result.level] : "",
          String(state.notes[criterion.id] ?? ""),
        ]);
      }
    }
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(detailRows), "Détails");

    const intervalRows = [
      ["Intervalles de niveaux", "Les notes sont saisies par l'évaluateur ; les intervalles sont indicatifs."],
      ["Niveau", "Pourcentage", "Critère", "Poids max", "Minimum (pts)", "Maximum (pts)"],
    ];
    for (const section of rubric) {
      for (const criterion of section.criteria) {
        for (const level of LEVELS) {
          const interval = levelPointsInterval(criterion.max, level, DEFAULT_LEVEL_BANDS);
          intervalRows.push([
            level,
            `${DEFAULT_LEVEL_BANDS[level].min}–${DEFAULT_LEVEL_BANDS[level].max} %`,
            criterion.title,
            criterion.max,
            interval.min,
            interval.max,
          ]);
        }
      }
    }
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(intervalRows), "Intervalles de niveaux");

    const metaRows = [
      ["Champ", "Valeur"],
      ["Projet", state.meta.projectName ?? ""],
      ["Mode", state.meta.mode ?? ""],
      ["Étudiant·e(s)", state.meta.student ?? ""],
      ["Lien GitHub", state.meta.github ?? ""],
      ["Date de validation", state.meta.date ?? ""],
      ["Périmètre", (state.meta.scope ?? []).join(", ")],
      ["Niveau IA déclaré", state.meta.aiLevelDeclared ?? ""],
      ["Niveau IA observé", state.meta.aiLevelObserved ?? ""],
      ["Observations enseignant·e", state.meta.teacherNotes ?? ""],
      ["Exporté le", new Date().toLocaleString("fr-FR")],
    ];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(metaRows), "Métadonnées");
    const fileName = `${(state.meta.projectName || "grille-competences").trim().replaceAll(/\s+/g, "_") || "grille-competences"}_${new Date().toISOString().slice(0, 10)}.xlsx`;
    XLSX.writeFile(wb, fileName);
    return true;
  }

  function confirmBeforeExport(state) {
    const totals = computeTotals(state);
    if (totals.complete) return true;
    return window.confirm(
      `La grille est incomplète : ${totals.evaluatedCount} critère(s) évalué(s) sur ${totals.totalCriteria}. Le total affiché est partiel et aucune note finale /20 ne sera exportée. Continuer ?`,
    );
  }

  function promptAfterExport(state) {
    const shouldReset = window.confirm("Export terminé. Archiver et nouvelle évaluation ?");
    if (shouldReset) resetForm(state);
  }

  function setLevel(state, criterionId, level) {
    const criterion = allCriteria().find((item) => item.id === criterionId);
    if (!criterion) return;

    const current = state.criteria[criterionId] ?? { level: null, note: null };
    state.criteria[criterionId] = {
      ...current,
      level: current.level === level ? null : level,
    };
    const mount = $("#rubricMount");
    if (mount) renderRubric(mount, state);
    updateTotalsUI(state);
    saveState(state);
    $(`[data-level-btn="${criterionId}"][data-level="${level}"]`)?.focus();
  }

  function normalizeAssignedNote(input, state) {
    const criterionId = input.getAttribute("data-assigned-note");
    const criterion = allCriteria().find((item) => item.id === criterionId);
    if (!criterionId || !criterion) return;

    const value = normalizeNote(input.value, criterion.max, NOTE_STEP);
    input.value = value === null ? "" : String(value);
    const current = state.criteria[criterionId] ?? { level: null, note: null };
    state.criteria[criterionId] = { ...current, note: value };
    updateTotalsUI(state);
    saveState(state);
  }

  function bindInteractions(state) {
    const metaForm = $("#metaForm");
    const teacherNotes = $("#teacherNotes");

    if (metaForm) {
      metaForm.addEventListener("input", () => {
        const fd = new FormData(metaForm);
        state.meta.projectName = String(fd.get("projectName") ?? "");
        state.meta.mode = String(fd.get("mode") ?? "");
        state.meta.student = String(fd.get("student") ?? "");
        state.meta.github = String(fd.get("github") ?? "");
        state.meta.date = String(fd.get("date") ?? "");
        state.meta.aiLevelDeclared = String(fd.get("aiLevelDeclared") ?? "");
        state.meta.aiLevelObserved = String(fd.get("aiLevelObserved") ?? "");
        state.meta.scope = $$('input[name="scope"]:checked', metaForm).map((item) => item.value);
        saveState(state);
      });
    }

    if (teacherNotes) {
      teacherNotes.addEventListener("input", () => {
        state.meta.teacherNotes = teacherNotes.value;
        saveState(state);
      });
    }

    document.addEventListener("click", (event) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;
      const button = target.closest("[data-level-btn]");
      if (!button) return;
      const criterionId = button.getAttribute("data-level-btn");
      const level = button.getAttribute("data-level");
      if (!criterionId || !level) return;
      setLevel(state, criterionId, level);
    });

    document.addEventListener("input", (event) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;
      if (target.matches("[data-note-input]")) {
        const id = target.getAttribute("data-note-input");
        if (!id) return;
        state.notes[id] = /** @type {HTMLTextAreaElement} */ (target).value;
        saveState(state);
      }
      if (target.matches("[data-assigned-note]")) {
        const criterionId = target.getAttribute("data-assigned-note");
        if (!criterionId) return;
        const current = state.criteria[criterionId] ?? { level: null, note: null };
        state.criteria[criterionId] = {
          ...current,
          note: target.value === "" ? null : target.value,
        };
        updateTotalsUI(state);
        saveState(state);
      }
    });

    document.addEventListener("blur", (event) => {
      const target = event.target;
      if (!(target instanceof HTMLInputElement) || !target.matches("[data-assigned-note]")) return;
      normalizeAssignedNote(target, state);
    }, true);

    document.addEventListener("keydown", (event) => {
      const target = event.target;
      if (!(target instanceof HTMLInputElement) || !target.matches("[data-assigned-note]") || event.key !== "Enter") return;
      event.preventDefault();
      normalizeAssignedNote(target, state);
      target.blur();
    });

    $("#btnExport")?.addEventListener("click", () => {
      if (!confirmBeforeExport(state)) return;
      downloadJson(state);
      promptAfterExport(state);
    });

    $("#btnExcel")?.addEventListener("click", () => {
      if (!confirmBeforeExport(state)) return;
      if (downloadExcel(state)) promptAfterExport(state);
    });
    $("#btnPdf")?.addEventListener("click", () => {
      if (confirmBeforeExport(state)) window.print();
    });

    $("#btnReset")?.addEventListener("click", () => {
      const ok = window.confirm("Réinitialiser toutes les données (niveaux, champs, observations) ?");
      if (!ok) return;
      resetForm(state);
    });

    $("#btnToggleRef")?.addEventListener("click", () => {
      const panel = $("#refPanel");
      const button = $("#btnToggleRef");
      if (!panel || !button) return;
      const hidden = panel.hidden;
      panel.hidden = !hidden;
      button.setAttribute("aria-expanded", hidden ? "true" : "false");
      button.textContent = hidden ? "Masquer le référentiel complet" : "Afficher le référentiel complet";
    });
  }

  function main() {
    const state = loadState();
    const mount = $("#rubricMount");
    const refMount = $("#refTableMount");
    const iaMount = $("#iaScaleMount");

    if (!mount) return;

    hydrateMeta(state);
    renderRubric(mount, state);
    if (refMount) renderReferenceTable(refMount);
    if (iaMount) renderIaScale(iaMount);
    updateTotalsUI(state);
    bindInteractions(state);
  }

  document.addEventListener("DOMContentLoaded", main);
})();
