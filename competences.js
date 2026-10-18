import { clamp, LEVEL_BANDS, computeCompetenceTotals, levelToPoints, sanitizeImportedJson, safeParse } from "./scoring.js";
import { readStoredState, writeStoredState, STORAGE_KEYS } from "./storage.js";

(() => {
  const STORAGE_KEY = STORAGE_KEYS.competencesV2;

  const LEVELS = ["A", "B", "C", "D"];
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
      levels: {},
      notes: {},
    };
  }

  function loadState() {
    return readStoredState(STORAGE_KEY, emptyState, [STORAGE_KEYS.competencesV1]);
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

  function levelToPointsForRender(level, max) {
    return levelToPoints(level, max, LEVEL_BANDS);
  }

  function computeTotals(state) {
    return computeCompetenceTotals(state.levels, rubric, LEVEL_BANDS);
  }

  function toScoreOutOf20(totalOn100) {
    return Number(((totalOn100 / 100) * 20).toFixed(1));
  }

  function renderRubric(mount, state) {
    mount.innerHTML = "";

    for (const section of rubric) {
      const sectionEl = document.createElement("section");
      sectionEl.className = "section";
      sectionEl.dataset.sectionId = section.id;

      const head = document.createElement("div");
      head.className = "section-head";
      head.innerHTML = `
        <h3 class="section-title">${section.title}</h3>
        <div class="pill" title="Niveaux renseignés dans cette section">
          <span>Renseignés</span>
          <strong><span data-section-filled="${section.id}">0</span> / ${section.criteria.length}</strong>
        </div>
      `;
      sectionEl.appendChild(head);

      for (const criterion of section.criteria) {
        const selected = state.levels[criterion.id] ?? "";
        const note = state.notes[criterion.id] ?? "";
        const converted = selected ? levelToPointsForRender(selected, criterion.max) : null;

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

        criterionEl.innerHTML = `
          <div class="criterion-head">
            <div>
              <h4 class="criterion-title">${criterion.title}</h4>
              <div class="small muted">${section.title}</div>
              ${hintHtml}
            </div>
            <div class="criterion-meta">
              <span class="tag tag-max">Poids : ${criterion.max} pts</span>
              ${converted !== null ? `<span class="tag tag-converted" data-converted-tag="${criterion.id}">˜ ${converted} pts</span>` : `<span class="tag tag-converted" data-converted-tag="${criterion.id}" hidden>—</span>`}
            </div>
          </div>

          <div class="level-picker" role="group" aria-label="Niveau pour ${escapeHtml(criterion.title)}">
            ${levelButtons}
          </div>

          ${descriptor}

          <label class="field comp-note-field">
            <span>Observations (critère)</span>
            <textarea rows="2" data-note-input="${criterion.id}" placeholder="Notes / justifications…">${escapeHtml(note)}</textarea>
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
    const { bySection, total, filled, totalCriteria, complete } = computeTotals(state);

    for (const section of rubric) {
      const count = section.criteria.filter((criterion) => state.levels[criterion.id]).length;
      const el = document.querySelector(`[data-section-filled="${section.id}"]`);
      if (el) el.textContent = String(count);
    }

    const filledEl = $("#levelsFilled");
    if (filledEl) filledEl.textContent = `${filled} / ${totalCriteria}`;

    const totalScore = $("#totalScore");
    const totalScore20 = $("#totalScore20");
    const scoreHint = $("#scoreHint");

    if (totalScore) totalScore.textContent = complete ? String(total) : "—";
    if (totalScore20) totalScore20.textContent = complete ? String(toScoreOutOf20(total)) : "—";
    if (scoreHint) scoreHint.textContent = complete ? "Conversion optionnelle (milieu de fourchette A–D)" : `${totalCriteria - filled} critère(s) restant(s) pour calculer le score converti`;

    const progress = $("#totalProgress");
    const bar = $(".progress");
    const percent = totalCriteria ? (filled / totalCriteria) * 100 : 0;
    if (progress) progress.style.width = `${percent}%`;
    if (bar) bar.setAttribute("aria-valuenow", String(Math.round(percent)));
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
    state.levels = fresh.levels;
    state.notes = fresh.notes;
    writeStoredState(STORAGE_KEY, state);
    hydrateMeta(state);
    if (mount) renderRubric(mount, state);
    updateTotalsUI(state);

    const el = $("#autosaveStatus");
    if (el) el.textContent = "Formulaire réinitialisé — prêt pour la prochaine évaluation";
  }

  function downloadJson(state) {
    const totals = computeTotals(state);
    const payload = {
      exportedAt: new Date().toISOString(),
      type: "competences",
      meta: state.meta,
      levels: state.levels,
      notes: state.notes,
      totals: {
        bySection: totals.bySection,
        total: totals.complete ? totals.total : null,
        totalOn20: totals.complete ? toScoreOutOf20(totals.total) : null,
        filled: totals.filled,
        totalCriteria: totals.totalCriteria,
      },
    };

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
      ["Axe", "Critère", "Niveau", "Pts convertis", "Observations"],
    ];

    for (const section of rubric) {
      for (const criterion of section.criteria) {
        const level = state.levels[criterion.id] ?? "";
        rows.push([section.title, criterion.title, level, level ? String(levelToPointsForRender(level, criterion.max)) : "", state.notes[criterion.id] ?? ""]);
      }
    }

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
      ["Axe", "Niveaux renseignés", "Score converti", "Max"],
      ...rubric.map((section) => {
        const filled = section.criteria.filter((criterion) => state.levels[criterion.id]).length;
        return [section.title, `${filled}/${section.criteria.length}`, totals.bySection[section.id] ?? 0, section.max];
      }),
      ["TOTAL (/100)", `${totals.filled}/${totals.totalCriteria}`, totals.complete ? totals.total : "—", 100],
      ["TOTAL (/20)", "", totals.complete ? toScoreOutOf20(totals.total) : "—", 20],
    ];

    const wsSummary = XLSX.utils.aoa_to_sheet(summaryRows);
    wsSummary["!cols"] = [{ wch: 28 }, { wch: 18 }, { wch: 14 }, { wch: 8 }];
    XLSX.utils.book_append_sheet(wb, wsSummary, "Synthèse");

    const detailHeader = ["Axe", "Critère", "Niveau", "Libellé niveau", "Pts convertis", "Max", "Descripteur", "Observations"];
    const detailRows = [detailHeader];
    for (const section of rubric) {
      for (const criterion of section.criteria) {
        const level = state.levels[criterion.id] ?? "";
        detailRows.push([section.title, criterion.title, level, level ? LEVEL_LABELS[level] : "", level ? levelToPointsForRender(level, criterion.max) : "", criterion.max, level ? criterion.levels[level] : "", String(state.notes[criterion.id] ?? "")]);
      }
    }

    const wsDetails = XLSX.utils.aoa_to_sheet(detailRows);
    wsDetails["!cols"] = [{ wch: 26 }, { wch: 32 }, { wch: 6 }, { wch: 22 }, { wch: 10 }, { wch: 6 }, { wch: 52 }, { wch: 40 }];
    XLSX.utils.book_append_sheet(wb, wsDetails, "Détails");

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
    const wsMeta = XLSX.utils.aoa_to_sheet(metaRows);
    wsMeta["!cols"] = [{ wch: 26 }, { wch: 60 }];
    XLSX.utils.book_append_sheet(wb, wsMeta, "Métadonnées");

    const fileName = `${(state.meta.projectName || "grille-competences").trim().replaceAll(/\s+/g, "_") || "grille-competences"}_${new Date().toISOString().slice(0, 10)}.xlsx`;
    XLSX.writeFile(wb, fileName);
    return true;
  }

  function promptAfterExport(state) {
    const shouldReset = window.confirm("Export terminé. Archiver et nouvelle évaluation ?");
    if (shouldReset) resetForm(state);
  }

  function setLevel(state, criterionId, level) {
    const criterion = allCriteria().find((item) => item.id === criterionId);
    if (!criterion) return;

    state.levels[criterionId] = state.levels[criterionId] === level ? "" : level;
    const mount = $("#rubricMount");
    if (mount) renderRubric(mount, state);
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
    });

    $("#btnExport")?.addEventListener("click", () => {
      downloadJson(state);
      promptAfterExport(state);
    });

    $("#btnExcel")?.addEventListener("click", () => {
      if (downloadExcel(state)) promptAfterExport(state);
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
