/* eslint-disable no-alert */
(() => {
  const STORAGE_KEY = "edueval-ai-rubric:v1";

  const rubric = [
    {
      id: "tech",
      title: "1. Maîtrise technique",
      max: 40,
      criteria: [
        {
          id: "tech_func",
          title: "Fonctionnalités attendues",
          max: 30,
          bloom: "Appliquer",
          description: "Implémentation correcte et complète des fonctionnalités requises.",
          indicators: [
            "Toutes les fonctionnalités du cahier des charges sont présentes, testables et fonctionnelles sans erreur critique.",
          ],
          evidence: ["Historique Git (commits)", "Démonstration de soutenance", "Tests exécutés/réussis"],
        },
        {
          id: "tech_understand",
          title: "Compréhension technique",
          max: 10,
          bloom: "Comprendre → Analyser",
          description: "Capacité à expliquer le fonctionnement du projet, les choix techniques et l'architecture.",
          indicators: [
            "Réponses précises aux questions de l'enseignant·e ; choix de bibliothèques et d'architecture justifiés.",
          ],
          evidence: ["Soutenance orale courte", "Justification technique écrite", "Schéma d'architecture"],
        },
      ],
    },
    {
      id: "quality",
      title: "2. Performance & qualité du projet",
      max: 30,
      criteria: [
        {
          id: "quality_code",
          title: "Qualité globale du code et du projet",
          max: 15,
          bloom: "Analyser",
          description: "Stabilité, cohérence, absence de bugs majeurs, code lisible et maintenable.",
          indicators: ["Code structuré et commenté ; aucune erreur console en production ; nommage cohérent."],
          evidence: ["Revue de code (capture ou partage)", "README complété", "Aucune erreur critique en démo"],
        },
        {
          id: "quality_ux",
          title: "Expérience utilisateur (UX/UI)",
          max: 15,
          bloom: "Analyser → Créer",
          description: "Navigation logique, ergonomie, fluidité et clarté de l'interface.",
          indicators: [
            "Un nouvel utilisateur peut utiliser l'interface sans aide ; les cas d'erreur sont gérés.",
          ],
          evidence: ["Capture annotée", "Scénario de test utilisateur", "Retour de pairs"],
        },
      ],
    },
    {
      id: "engagement",
      title: "3. Engagement & processus de travail",
      max: 20,
      criteria: [
        {
          id: "eng_collab",
          title: "Outils collaboratifs (Git, GitHub Projects…)",
          max: 8,
          bloom: "Appliquer → Évaluer",
          description: "Commits réguliers avec messages clairs, progression traçable, collaboration visible.",
          indicators: ["≥ 1 commit par session, messages descriptifs, branches utilisées pour le travail de groupe."],
          evidence: ["Historique Git public", "GitHub Projects / Issues", "Journaux de contribution"],
        },
        {
          id: "eng_autonomy",
          title: "Autonomie & initiative",
          max: 6,
          bloom: "Créer",
          description: "Recherche autonome, résolution de problèmes sans aide constante, prise d'initiative.",
          indicators: ["Problèmes non spécifiés résolus, fonctionnalités bonus ajoutées."],
          evidence: ["Journal de bord", "Historique de recherche", "Entretien oral"],
        },
        {
          id: "eng_plan",
          title: "Organisation & planification",
          max: 6,
          bloom: "Évaluer",
          description: "Structuration des tâches, respect des jalons et gestion du temps.",
          indicators: ["Plan initial suivi, tickets GitHub clos à temps, aucun sprint vide."],
          evidence: ["Tableau de bord (GitHub)", "Jalons respectés", "Journal de bord"],
        },
      ],
    },
    {
      id: "ai",
      title: "4. Usage de l'IA générative",
      max: 10,
      criteria: [
        {
          id: "ai_level",
          title: "Niveau d'usage de l'IA (échelle 1–5)",
          max: 4,
          bloom: "Analyser",
          description: "Cohérence entre le niveau déclaré, l'usage observé et les livrables.",
          indicators: ["Niveau déclaré étayé par des preuves (captures, journaux). Aucun écart entre discours et pratique."],
          evidence: ["Captures d'échanges IA", "Journaux de prompts", "Entretien oral"],
        },
        {
          id: "ai_justify",
          title: "Justification de l'usage de l'IA",
          max: 3,
          bloom: "Comprendre → Analyser",
          description: "Capacité à expliquer pourquoi, quand et comment l'IA a été utilisée.",
          indicators: [
            "Exemples précis (« J'ai utilisé ChatGPT pour générer X parce que… »).",
          ],
          evidence: ["Journal de bord réflexif", "Section « Usage de l'IA » dans le README", "Soutenance orale"],
        },
        {
          id: "ai_critical",
          title: "Esprit critique face aux sorties de l'IA",
          max: 3,
          bloom: "Évaluer",
          description: "Capacité à détecter erreurs, limites, biais et corriger les suggestions de l'IA.",
          indicators: [
            "Au moins un exemple documenté de correction/rejet d'une réponse IA ; l'étudiant·e n'accepte pas aveuglément les sorties.",
          ],
          evidence: ["Capture avant/après correction IA", "Commentaire explicite dans le code", "Soutenance : question critique"],
        },
      ],
    },
  ];

  const iaScale = [
    {
      level: "N1",
      label: "Sans IA",
      behaviors:
        "Aucun outil d'IA utilisé. L'étudiant·e travaille uniquement avec des ressources humaines et la documentation standard.",
      evidence: "Déclaration écrite + aucune mention d'IA dans le journal de bord.",
    },
    {
      level: "N2",
      label: "Préparation avec IA",
      behaviors:
        "IA utilisée pour l'idéation, la recherche, le brainstorming. L'étudiant·e réécrit ensuite avec ses propres mots.",
      evidence: "Captures de prompts de recherche ; sections de pré-rédaction dans le journal de bord.",
    },
    {
      level: "N3",
      label: "Collaboration avec IA",
      behaviors:
        "IA comme assistant : génération de code, amélioration de texte, correction. L'étudiant·e relit et ajuste chaque sortie.",
      evidence:
        "Journal des échanges IA (ChatGPT, Copilot…) ; éléments montrant l'origine IA et les corrections apportées.",
    },
    {
      level: "N4",
      label: "Intégration complète",
      behaviors:
        "IA intégrée à chaque étape. L'étudiant·e orchestre les outils, choisit les modèles et évalue les limites.",
      evidence:
        "Pipeline détaillé (quel outil, à quelle étape) ; exemples de sorties IA rejetées/corrigées ; soutenance orale.",
    },
    {
      level: "N5",
      label: "Exploration créative",
      behaviors:
        "IA utilisée de façon innovante et réflexive. L'étudiant·e questionne les biais, documente les expérimentations, crée de nouveaux usages.",
      evidence:
        "Rapport réflexif sur l'usage de l'IA ; expérimentations documentées ; exemples de détournements créatifs ou critiques.",
    },
  ];

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  function clamp(n, min, max) {
    if (Number.isNaN(n)) return min;
    return Math.min(max, Math.max(min, n));
  }

  function safeParse(json, fallback) {
    try {
      const v = JSON.parse(json);
      return v ?? fallback;
    } catch {
      return fallback;
    }
  }

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
      },
      scores: {},
      notes: {},
    };
  }

  function loadState() {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? safeParse(raw, emptyState()) : emptyState();
  }

  function saveState(state) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    const el = $("#autosaveStatus");
    if (el) el.textContent = `Enregistré à ${new Date().toLocaleTimeString("fr-FR")}`;
  }

  function computeTotals(state) {
    const bySection = {};
    for (const section of rubric) {
      let sum = 0;
      for (const c of section.criteria) {
        const v = Number(state.scores[c.id] ?? 0);
        sum += clamp(v, 0, c.max);
      }
      bySection[section.id] = clamp(sum, 0, section.max);
    }
    const total = Object.values(bySection).reduce((a, b) => a + b, 0);
    return { bySection, total: clamp(total, 0, 100) };
  }

  function toScoreOutOf20(totalOn100) {
    const raw = (totalOn100 / 100) * 20;
    return Math.round(raw * 10) / 10;
  }

  function escapeHtml(str) {
    return String(str)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
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
        <div class="pill" title="Total de la section">
          <span>Total</span>
          <strong><span data-section-total="${section.id}">0</span> / ${section.max}</strong>
        </div>
      `;
      sectionEl.appendChild(head);

      for (const c of section.criteria) {
        const criterionEl = document.createElement("article");
        criterionEl.className = "criterion";
        criterionEl.dataset.criterionId = c.id;

        const current = clamp(Number(state.scores[c.id] ?? 0), 0, c.max);
        const note = state.notes[c.id] ?? "";

        criterionEl.innerHTML = `
          <div class="criterion-head">
            <div>
              <h4 class="criterion-title">${c.title}</h4>
              <div class="small muted">${section.title}</div>
            </div>
            <div class="criterion-meta">
              <span class="tag tag-bloom">Bloom : ${c.bloom}</span>
              <span class="tag tag-max">Max : ${c.max} pts</span>
            </div>
          </div>

          <div class="criterion-grid">
            <div class="desc">
              <div><b>Description :</b> ${c.description}</div>
              <div style="margin-top:8px"><b>Indicateurs :</b></div>
              <ul>
                ${c.indicators.map((x) => `<li>${x}</li>`).join("")}
              </ul>
              <div style="margin-top:8px"><b>Preuves attendues :</b></div>
              <ul>
                ${c.evidence.map((x) => `<li>${x}</li>`).join("")}
              </ul>
            </div>

            <div class="inputs">
              <div class="score-input">
                <div>
                  <div class="label2">Score</div>
                  <div class="small muted">0 à ${c.max}</div>
                </div>
                <input
                  type="number"
                  inputmode="numeric"
                  min="0"
                  max="${c.max}"
                  step="0.5"
                  value="${current}"
                  aria-label="Score pour ${c.title}"
                  data-score-input="${c.id}"
                />
              </div>
              <label class="field">
                <span>Observations (critère)</span>
                <textarea rows="3" data-note-input="${c.id}" placeholder="Notes / justifications…">${escapeHtml(
                  note
                )}</textarea>
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
    const rows = iaScale
      .map(
        (row, i) => `
          <tr class="ia-row-n${i + 1}">
            <td class="level">${row.level}</td>
            <td class="label">${row.label}</td>
            <td>${row.behaviors}</td>
            <td>${row.evidence}</td>
          </tr>
        `
      )
      .join("");

    mount.innerHTML = `
      <div class="ia-table-wrap" role="region" aria-label="Table indicative de l'échelle d'usage de l'IA">
        <table class="ia-table">
          <thead>
            <tr>
              <th>Niveau</th>
              <th>Libellé</th>
              <th>Comportements observables</th>
              <th>Preuves attendues</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    `;
  }

  function updateTotalsUI(state) {
    const { bySection, total } = computeTotals(state);

    for (const [sectionId, v] of Object.entries(bySection)) {
      const el = document.querySelector(`[data-section-total="${sectionId}"]`);
      if (el) el.textContent = String(v);
    }

    const totalScore = $("#totalScore");
    if (totalScore) totalScore.textContent = String(total);

    const totalScore20 = $("#totalScore20");
    if (totalScore20) totalScore20.textContent = String(toScoreOutOf20(total));

    const pbar = $("#totalProgress");
    const prog = $(".progress");
    if (pbar) pbar.style.width = `${total}%`;
    if (prog) prog.setAttribute("aria-valuenow", String(total));
  }

  function hydrateMeta(state) {
    const metaForm = $("#metaForm");
    if (metaForm) {
      const setVal = (name, val) => {
        const el = $(`[name="${name}"]`, metaForm);
        if (el && "value" in el) el.value = String(val ?? "");
      };
      setVal("projectName", state.meta.projectName);
      setVal("mode", state.meta.mode);
      setVal("student", state.meta.student);
      setVal("github", state.meta.github);
      setVal("date", state.meta.date);

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
    state.scores = fresh.scores;
    state.notes = fresh.notes;
    localStorage.removeItem(STORAGE_KEY);
    hydrateMeta(state);
    if (mount) renderRubric(mount, state);
    updateTotalsUI(state);
    const el = $("#autosaveStatus");
    if (el) el.textContent = "Formulaire réinitialisé — prêt pour la prochaine évaluation";
  }

  function downloadJson(state) {
    const { bySection, total } = computeTotals(state);
    const payload = {
      exportedAt: new Date().toISOString(),
      type: "ponderee",
      meta: state.meta,
      scores: state.scores,
      notes: state.notes,
      totals: { bySection, total, totalOn20: toScoreOutOf20(total) },
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const base = (state.meta.projectName || "grille-ponderee").trim().replaceAll(/\s+/g, "_");
    a.download = `${base || "grille-ponderee"}_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  function downloadExcel(state) {
    const XLSX = /** @type {any} */ (globalThis.XLSX);
    if (!XLSX) {
      alert("Export Excel indisponible (bibliothèque XLSX non chargée). Vérifiez votre connexion.");
      return false;
    }

    const { bySection, total } = computeTotals(state);
    const baseName = (state.meta.projectName || "grille-ponderee")
      .trim()
      .replaceAll(/\s+/g, "_")
      .slice(0, 60);

    const wb = XLSX.utils.book_new();

    const summaryRows = [
      ["Axe", "Score", "Max"],
      ["Maîtrise technique", bySection.tech ?? 0, 40],
      ["Performance & qualité", bySection.quality ?? 0, 30],
      ["Engagement", bySection.engagement ?? 0, 20],
      ["Usage IA", bySection.ai ?? 0, 10],
      ["TOTAL (/100)", total, 100],
      ["TOTAL (/20)", toScoreOutOf20(total), 20],
    ];
    const wsSummary = XLSX.utils.aoa_to_sheet(summaryRows);
    wsSummary["!cols"] = [{ wch: 26 }, { wch: 10 }, { wch: 8 }];
    XLSX.utils.book_append_sheet(wb, wsSummary, "Synthèse");

    const detailHeader = ["Axe", "Critère", "Bloom", "Score", "Max", "Description", "Indicateurs", "Preuves", "Observations"];
    const detailRows = [detailHeader];
    for (const section of rubric) {
      for (const c of section.criteria) {
        const score = clamp(Number(state.scores[c.id] ?? 0), 0, c.max);
        const obs = String(state.notes[c.id] ?? "");
        detailRows.push([
          section.title,
          c.title,
          c.bloom,
          score,
          c.max,
          c.description,
          (c.indicators || []).join(" | "),
          (c.evidence || []).join(" | "),
          obs,
        ]);
      }
    }
    const wsDetails = XLSX.utils.aoa_to_sheet(detailRows);
    wsDetails["!cols"] = [
      { wch: 26 },
      { wch: 32 },
      { wch: 18 },
      { wch: 8 },
      { wch: 6 },
      { wch: 40 },
      { wch: 48 },
      { wch: 40 },
      { wch: 40 },
    ];
    XLSX.utils.book_append_sheet(wb, wsDetails, "Détails");

    const metaRows = [
      ["Champ", "Valeur"],
      ["Projet", state.meta.projectName ?? ""],
      ["Mode", state.meta.mode ?? ""],
      ["Étudiant·e(s)", state.meta.student ?? ""],
      ["Lien GitHub", state.meta.github ?? ""],
      ["Date de validation", state.meta.date ?? ""],
      ["Périmètre", (state.meta.scope ?? []).join(", ")],
      ["Observations enseignant·e", state.meta.teacherNotes ?? ""],
      ["Exporté le", new Date().toLocaleString("fr-FR")],
    ];
    const wsMeta = XLSX.utils.aoa_to_sheet(metaRows);
    wsMeta["!cols"] = [{ wch: 26 }, { wch: 60 }];
    XLSX.utils.book_append_sheet(wb, wsMeta, "Métadonnées");

    const filename = `${baseName || "grille-ponderee"}_${new Date().toISOString().slice(0, 10)}.xlsx`;
    XLSX.writeFile(wb, filename);
    return true;
  }

  function submitAndReset(state) {
    downloadJson(state);
    resetForm(state);
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
        const scopes = $$('input[name="scope"]:checked', metaForm).map((x) => x.value);
        state.meta.scope = scopes;
        saveState(state);
      });
    }

    if (teacherNotes) {
      teacherNotes.addEventListener("input", () => {
        state.meta.teacherNotes = teacherNotes.value;
        saveState(state);
      });
    }

    document.addEventListener("input", (e) => {
      const t = e.target;
      if (!(t instanceof HTMLElement)) return;

      if (t.matches("[data-score-input]")) {
        const id = t.getAttribute("data-score-input");
        const crit = rubric.flatMap((s) => s.criteria).find((c) => c.id === id);
        if (!crit) return;

        const input = /** @type {HTMLInputElement} */ (t);
        const v = clamp(Number(input.value), 0, crit.max);
        if (Number.isNaN(v)) return;
        state.scores[crit.id] = v;
        input.value = String(v);
        updateTotalsUI(state);
        saveState(state);
      }

      if (t.matches("[data-note-input]")) {
        const id = t.getAttribute("data-note-input");
        if (!id) return;
        const ta = /** @type {HTMLTextAreaElement} */ (t);
        state.notes[id] = ta.value;
        saveState(state);
      }
    });

    $("#btnSubmit")?.addEventListener("click", () => submitAndReset(state));

    $("#btnPrint")?.addEventListener("click", () => window.print());
    $("#btnPdf")?.addEventListener("click", () => window.print());

    $("#btnExport")?.addEventListener("click", () => {
      downloadJson(state);
      resetForm(state);
    });

    $("#btnExcel")?.addEventListener("click", () => {
      if (downloadExcel(state)) resetForm(state);
    });

    $("#btnReset")?.addEventListener("click", () => {
      const ok = confirm("Réinitialiser toutes les données (scores, champs, observations) ?");
      if (!ok) return;
      resetForm(state);
    });
  }

  function main() {
    const state = loadState();
    const mount = $("#rubricMount");
    const iaMount = $("#iaScaleMount");

    if (!mount || !iaMount) return;

    hydrateMeta(state);
    renderRubric(mount, state);
    renderIaScale(iaMount);
    updateTotalsUI(state);
    bindInteractions(state);
  }

  document.addEventListener("DOMContentLoaded", main);
})();
