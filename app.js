/* eslint-disable no-alert */
(() => {
  const STORAGE_KEY = "grille-evaluation-ia:v1";

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
          description:
            "Implémentation correcte et complète des fonctionnalités demandées.",
          indicators: [
            "Toutes les fonctionnalités du cahier des charges sont présentes, testables et fonctionnelles sans erreur critique.",
          ],
          evidence: ["Historique Git (commits)", "Démo en soutenance", "Tests exécutés/passés"],
        },
        {
          id: "tech_understand",
          title: "Compréhension technique",
          max: 10,
          bloom: "Comprendre → Analyser",
          description:
            "Capacité à expliquer le fonctionnement, les choix techniques et l’architecture.",
          indicators: [
            "Réponses précises aux questions de l’enseignant, justification des choix de librairies/architecture.",
          ],
          evidence: ["Mini-soutenance orale", "Justification écrite des choix techniques", "Schéma d’architecture"],
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
          description:
            "Stabilité, cohérence, absence de bugs majeurs, lisibilité et maintenabilité du code.",
          indicators: ["Code structuré et commenté, pas d’erreur console en production, nomenclature cohérente."],
          evidence: ["Revue de code (capture ou partage)", "README complété", "Aucune erreur critique en démo"],
        },
        {
          id: "quality_ux",
          title: "Expérience utilisateur (UX/UI)",
          max: 15,
          bloom: "Analyser → Créer",
          description: "Navigation logique, ergonomie, fluidité et clarté de l’interface.",
          indicators: [
            "Un utilisateur non initialisé peut utiliser l’interface sans aide, les états d’erreur sont gérés.",
          ],
          evidence: ["Capture d’écran annotée", "Scénario de test utilisateur", "Retour de pair"],
        },
      ],
    },
    {
      id: "engagement",
      title: "3. Engagement et démarche de travail",
      max: 20,
      criteria: [
        {
          id: "eng_collab",
          title: "Usage des outils de collaboration (Git, GitHub Projects…)",
          max: 8,
          bloom: "Appliquer → Évaluer",
          description:
            "Commits réguliers et messages clairs, traçabilité de l’évolution, travail collaboratif visible.",
          indicators: ["≥ 1 commit par session, messages descriptifs, branches utilisées si groupe."],
          evidence: ["Historique Git public", "GitHub Projects / Issues", "Logs de contribution"],
        },
        {
          id: "eng_autonomy",
          title: "Autonomie & initiative",
          max: 6,
          bloom: "Créer",
          description:
            "Recherche personnelle, résolution de problèmes sans aide extérieure systématique, prise d’initiative.",
          indicators: ["Problèmes non-spécifiés résolus, fonctionnalités bonus ajoutées."],
          evidence: ["Journal de bord", "Historique des recherches", "Entretien oral"],
        },
        {
          id: "eng_plan",
          title: "Organisation & planification du travail",
          max: 6,
          bloom: "Évaluer",
          description: "Structuration des tâches, respect des étapes et gestion du temps.",
          indicators: ["Planning initial respecté, tickets GitHub fermés à temps, aucun sprint vide."],
          evidence: ["Planning produit (board GitHub)", "Jalons respectés", "Journal de bord"],
        },
      ],
    },
    {
      id: "ai",
      title: "4. Usage de l’IA générative",
      max: 10,
      criteria: [
        {
          id: "ai_level",
          title: "Niveau d’usage de l’IA (selon l’échelle 1–5)",
          max: 4,
          bloom: "Analyser",
          description: "Cohérence entre le niveau déclaré, l’usage réel observé et les productions.",
          indicators: ["Le niveau déclaré est étayé par des preuves (captures, logs). Pas d’écart entre discours et pratique."],
          evidence: ["Captures des échanges IA", "Logs de prompts", "Entretien oral"],
        },
        {
          id: "ai_justify",
          title: "Justification de l’usage de l’IA",
          max: 3,
          bloom: "Comprendre → Analyser",
          description: "Capacité à expliquer pourquoi, quand et comment l’IA a été utilisée.",
          indicators: [
            "Exemples précis (« j’ai utilisé ChatGPT pour générer X parce que… »).",
          ],
          evidence: ["Journal de bord réflexif", "Section « Usage IA » dans README", "Soutenance orale"],
        },
        {
          id: "ai_critical",
          title: "Esprit critique face aux productions de l’IA",
          max: 3,
          bloom: "Évaluer",
          description: "Capacité à détecter erreurs, limites, biais et à corriger les propositions de l’IA.",
          indicators: [
            "Au moins un exemple documenté de correction/rejet d’une réponse IA ; l’étudiant ne valide pas aveuglément.",
          ],
          evidence: ["Capture avant/après correction IA", "Commentaire de code explic.", "Soutenance : question critique"],
        },
      ],
    },
  ];

  const iaScale = [
    {
      level: "N1",
      label: "Sans IA",
      behaviors:
        "Aucun outil IA utilisé. L’étudiant travaille uniquement avec des ressources humaines, documentation classique.",
      evidence: "Déclaration écrite + aucune mention d’IA dans le journal de bord.",
    },
    {
      level: "N2",
      label: "Préparation avec l’IA",
      behaviors:
        "IA utilisée pour idéation, recherche, brainstorming. L’étudiant reformule ensuite en ses propres mots.",
      evidence:
        "Captures d’écran des prompts de recherche ; sections du journal de bord pré-rédaction.",
    },
    {
      level: "N3",
      label: "Collaboration avec l’IA",
      behaviors:
        "IA comme assistant : génération de code, amélioration de texte, correction. L’étudiant revérifie et ajuste chaque sortie.",
      evidence:
        "Log des échanges IA (ChatGPT, Copilot…) ; éléments indiquant l’origine IA et les corrections effectuées.",
    },
    {
      level: "N4",
      label: "Intégration totale de l’IA",
      behaviors:
        "IA intégrée à toutes les étapes. L’étudiant orchestre les outils, choisit les bons modèles et évalue les limites.",
      evidence:
        "Pipeline détaillé (quel outil, à quelle étape) ; exemples de rejets/corrections de sorties IA ; soutenance orale.",
    },
    {
      level: "N5",
      label: "Exploration créative avec l’IA",
      behaviors:
        "IA utilisée de manière innovante et réflexive. L’étudiant questionne les biais, documente ses expérimentations, crée des usages nouveaux.",
      evidence:
        "Rapport réflexif sur l’usage IA ; expérimentations documentées ; exemples de détournements créatifs ou critiques.",
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
    if (el) el.textContent = `Sauvegardé à ${new Date().toLocaleTimeString()}`;
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
        <div class="pill" title="Total de l’axe">
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
              <span class="tag tag-bloom">Bloom: ${c.bloom}</span>
              <span class="tag tag-max">Max: ${c.max} pts</span>
            </div>
          </div>

          <div class="criterion-grid">
            <div class="desc">
              <div><b>Description:</b> ${c.description}</div>
              <div style="margin-top:8px"><b>Indicateurs:</b></div>
              <ul>
                ${c.indicators.map((x) => `<li>${x}</li>`).join("")}
              </ul>
              <div style="margin-top:8px"><b>Preuves attendues:</b></div>
              <ul>
                ${c.evidence.map((x) => `<li>${x}</li>`).join("")}
              </ul>
            </div>

            <div class="inputs">
              <div class="score-input">
                <div>
                  <div class="label2">Note</div>
                  <div class="small muted">0 à ${c.max}</div>
                </div>
                <input
                  type="number"
                  inputmode="numeric"
                  min="0"
                  max="${c.max}"
                  step="0.5"
                  value="${current}"
                  aria-label="Note pour ${c.title}"
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
    mount.innerHTML = `
      <div class="ia-table-wrap" role="region" aria-label="Tableau indicatif de l’échelle d’usage de l’IA">
        <table class="ia-table">
          <thead>
            <tr>
              <th>Niveau</th>
              <th>Label</th>
              <th>Comportements observables</th>
              <th>Preuves attendues</th>
            </tr>
          </thead>
          <tbody>
            <tr class="ia-row-n1">
              <td class="level">N1</td>
              <td class="label">Sans IA</td>
              <td>Aucun outil IA utilisé. L’étudiant travaille uniquement avec des ressources humaines, documentation classique.</td>
              <td>Déclaration écrite + aucune mention d’IA dans le journal de bord.</td>
            </tr>
            <tr class="ia-row-n2">
              <td class="level">N2</td>
              <td class="label">Préparation avec l’IA</td>
              <td>IA utilisée pour idéation, recherche, brainstorming. L’étudiant reformule ensuite en ses propres mots.</td>
              <td>Captures d’écran des prompts de recherche ; sections du journal de bord pré-rédaction.</td>
            </tr>
            <tr class="ia-row-n3">
              <td class="level">N3</td>
              <td class="label">Collaboration avec l’IA</td>
              <td>IA comme assistant : génération de code, amélioration de texte, correction. L’étudiant revérifie et ajuste chaque sortie.</td>
              <td>Log des échanges IA (ChatGPT, Copilot…) ; éléments indiquant l’origine IA et les corrections effectuées.</td>
            </tr>
            <tr class="ia-row-n4">
              <td class="level">N4</td>
              <td class="label">Intégration totale de l’IA</td>
              <td>IA intégrée à toutes les étapes. L’étudiant orchestre les outils, choisit les bons modèles et évalue les limites.</td>
              <td>Pipeline détaillé (quel outil, à quelle étape) ; exemples de rejets/corrections de sortie IA ; soutenance orale.</td>
            </tr>
            <tr class="ia-row-n5">
              <td class="level">N5</td>
              <td class="label">Exploration créative avec l’IA</td>
              <td>IA utilisée de manière innovante et réflexive. L’étudiant questionne les biais, documente ses expérimentations, crée des usages nouveaux.</td>
              <td>Rapport réflexif sur l’usage IA ; expérimentations documentées ; exemples de détournements créatifs ou critiques.</td>
            </tr>
          </tbody>
        </table>
      </div>
    `;
  }

  function escapeHtml(str) {
    return String(str)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function updateTotalsUI(state) {
    const { bySection, total } = computeTotals(state);

    for (const [sectionId, v] of Object.entries(bySection)) {
      const el = document.querySelector(`[data-section-total="${sectionId}"]`);
      if (el) el.textContent = String(v);
    }

    const totalScore = $("#totalScore");
    if (totalScore) totalScore.textContent = String(total);

    const pbar = $("#totalProgress");
    const prog = $(".progress");
    if (pbar) pbar.style.width = `${total}%`;
    if (prog) prog.setAttribute("aria-valuenow", String(total));
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

    $("#btnPrint")?.addEventListener("click", () => window.print());
    $("#btnPdf")?.addEventListener("click", () => window.print());

    $("#btnExport")?.addEventListener("click", () => {
      const { bySection, total } = computeTotals(state);
      const payload = {
        exportedAt: new Date().toISOString(),
        meta: state.meta,
        scores: state.scores,
        notes: state.notes,
        totals: { bySection, total },
      };

      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const base = (state.meta.projectName || "grille-evaluation").trim().replaceAll(/\s+/g, "_");
      a.download = `${base || "grille-evaluation"}_${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    });

    $("#btnExcel")?.addEventListener("click", () => {
      // SheetJS is loaded from CDN in index.html and exposes global XLSX
      const XLSX = /** @type {any} */ (globalThis.XLSX);
      if (!XLSX) {
        alert("Export Excel indisponible (librairie XLSX non chargée). Vérifiez votre connexion Internet.");
        return;
      }

      const { bySection, total } = computeTotals(state);
      const baseName = (state.meta.projectName || "grille-evaluation")
        .trim()
        .replaceAll(/\s+/g, "_")
        .slice(0, 60);

      const wb = XLSX.utils.book_new();

      // Feuille 1: Résumé
      const summaryRows = [
        ["Axe", "Note", "Max"],
        ["Maîtrise technique", bySection.tech ?? 0, 40],
        ["Performance & qualité", bySection.quality ?? 0, 30],
        ["Engagement", bySection.engagement ?? 0, 20],
        ["Usage IA", bySection.ai ?? 0, 10],
        ["TOTAL", total, 100],
      ];
      const wsSummary = XLSX.utils.aoa_to_sheet(summaryRows);
      wsSummary["!cols"] = [{ wch: 26 }, { wch: 10 }, { wch: 8 }];
      XLSX.utils.book_append_sheet(wb, wsSummary, "Résumé");

      // Feuille 2: Détails (critères)
      const detailHeader = ["Axe", "Critère", "Bloom", "Note", "Max", "Description", "Indicateurs", "Preuves", "Observations"];
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

      // Feuille 3: Meta
      const metaRows = [
        ["Champ", "Valeur"],
        ["Projet", state.meta.projectName ?? ""],
        ["Mode", state.meta.mode ?? ""],
        ["Étudiant(e)", state.meta.student ?? ""],
        ["Lien GitHub", state.meta.github ?? ""],
        ["Date de validation", state.meta.date ?? ""],
        ["Périmètre", (state.meta.scope ?? []).join(", ")],
        ["Observations enseignant(e)", state.meta.teacherNotes ?? ""],
        ["Exporté le", new Date().toLocaleString()],
      ];
      const wsMeta = XLSX.utils.aoa_to_sheet(metaRows);
      wsMeta["!cols"] = [{ wch: 26 }, { wch: 60 }];
      XLSX.utils.book_append_sheet(wb, wsMeta, "Meta");

      const filename = `${baseName || "grille-evaluation"}_${new Date().toISOString().slice(0, 10)}.xlsx`;
      XLSX.writeFile(wb, filename);
    });

    $("#btnReset")?.addEventListener("click", () => {
      const ok = confirm("Réinitialiser toutes les données (notes, champs, observations) ?");
      if (!ok) return;
      localStorage.removeItem(STORAGE_KEY);
      location.reload();
    });
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
