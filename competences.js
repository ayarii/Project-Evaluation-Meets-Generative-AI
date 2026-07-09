/* eslint-disable no-alert */
(() => {
  const STORAGE_KEY = "edueval-ai-competences:v1";

  const LEVELS = ["A", "B", "C", "D"];
  const LEVEL_LABELS = {
    A: "Excellent",
    B: "Maîtrisé",
    C: "En cours d'acquisition",
    D: "Non acquis",
  };
  const LEVEL_MID = { A: 0.95, B: 0.82, C: 0.67, D: 0.45 };

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
          levels: {
            A: "Toutes les fonctionnalités du cahier des charges sont implémentées, testées et fonctionnent sans erreur bloquante ; des fonctionnalités bonus pertinentes ont été ajoutées de sa propre initiative.",
            B: "Toutes les fonctionnalités attendues sont présentes et opérationnelles ; quelques erreurs mineures ponctuelles sans impact sur l'usage.",
            C: "La majorité des fonctionnalités sont présentes mais certaines restent incomplètes, instables, ou nécessitent un contournement pour fonctionner.",
            D: "Des fonctionnalités majeures sont absentes ou non fonctionnelles ; le projet ne démarre pas ou plante lors de la démonstration.",
          },
        },
        {
          id: "tech_understand",
          title: "Compréhension technique / architecture",
          max: 10,
          levels: {
            A: "Explique avec précision l'ensemble des choix techniques et l'architecture ; justifie des alternatives possibles ; répond à des questions imprévues.",
            B: "Explique correctement le fonctionnement et les choix principaux du projet, avec quelques hésitations sur des détails secondaires.",
            C: "Décrit le projet de façon générale mais peine à justifier les choix techniques ou l'architecture retenue.",
            D: "Ne peut pas expliquer le fonctionnement du projet, ou attribue le code à une source externe sans en démontrer la compréhension.",
          },
        },
      ],
    },
    {
      id: "quality",
      title: "2. Performance & qualité",
      max: 30,
      criteria: [
        {
          id: "quality_code",
          title: "Qualité globale du code et du projet",
          max: 15,
          levels: {
            A: "Code structuré en modules réutilisables, commenté, sans erreur en production ; conventions de nommage rigoureuses et cohérentes ; README complet.",
            B: "Code globalement propre et lisible ; quelques erreurs mineures non bloquantes ; README présent et suffisant.",
            C: "Code fonctionnel mais désorganisé ou dupliqué, peu commenté ; README minimal ou incomplet.",
            D: "Code difficile à lire, erreurs bloquantes constatées en production, absence de structuration visible.",
          },
        },
        {
          id: "quality_ux",
          title: "UX / UI",
          max: 15,
          levels: {
            A: "Interface fluide et intuitive ; tous les cas d'erreur sont gérés ; un nouvel utilisateur l'utilise sans aide ni explication.",
            B: "Navigation logique et ergonomique ; la majorité des cas d'usage courants sont couverts correctement.",
            C: "Interface utilisable mais confuse par endroits ; certains cas d'erreur ne sont pas gérés.",
            D: "Interface peu compréhensible, navigation incohérente, blocages fréquents empêchant l'usage normal.",
          },
        },
      ],
    },
    {
      id: "engagement",
      title: "3. Engagement & processus",
      max: 20,
      criteria: [
        {
          id: "eng_collab",
          title: "Outils collaboratifs (Git, GitHub Projects…)",
          max: 8,
          levels: {
            A: "Commits réguliers à chaque session, messages clairs et descriptifs, usage de branches/PR pour le travail de groupe, historique exemplaire et traçable.",
            B: "Commits réguliers avec des messages globalement clairs ; usage correct des fonctionnalités de base de Git.",
            C: "Commits rares ou peu descriptifs ; usage minimal des fonctionnalités collaboratives (issues, projects…).",
            D: "Un seul commit final ou absence d'historique exploitable pour tracer la progression du travail.",
          },
        },
        {
          id: "eng_autonomy",
          title: "Autonomie & initiative",
          max: 6,
          levels: {
            A: "Résout des problèmes non spécifiés dans le cahier des charges ; propose et développe des idées personnelles au-delà des attentes.",
            B: "Avance de façon autonome sur les tâches prévues, avec peu de sollicitation de l'enseignant.",
            C: "A besoin d'un accompagnement régulier pour avancer sur les tâches, même simples.",
            D: "Ne progresse pas sans intervention directe et continue de l'enseignant ou d'un tiers.",
          },
        },
        {
          id: "eng_plan",
          title: "Organisation & planification",
          max: 6,
          levels: {
            A: "Plan initial suivi et ajusté avec pertinence en cas d'imprévu ; jalons respectés ; aucun sprint/période sans avancement.",
            B: "Organisation globalement respectée ; quelques ajustements mineurs de planning sans conséquence sur le résultat.",
            C: "Organisation présente mais peu suivie dans les faits ; retards ponctuels sur les jalons prévus.",
            D: "Absence de planification visible ; travail réalisé dans l'urgence ou de façon désordonnée.",
          },
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
          title: "Niveau d'usage de l'IA (échelle N1–N5)",
          hint: "Ce critère évalue la cohérence entre le niveau N déclaré et les preuves observées — pas le niveau N lui-même.",
          max: 4,
          levels: {
            A: "Le niveau déclaré est pleinement cohérent avec les preuves fournies (captures, journal de prompts) ; aucun écart entre le discours et la pratique observée.",
            B: "Le niveau déclaré est globalement cohérent avec les preuves fournies, avec de légers écarts mineurs.",
            C: "Le niveau déclaré est partiellement étayé ; certaines preuves manquent ou sont peu convaincantes.",
            D: "Aucune preuve d'usage fournie, ou incohérence marquée entre le niveau déclaré et l'usage réellement observé.",
          },
        },
        {
          id: "ai_justify",
          title: "Justification de l'usage de l'IA",
          max: 3,
          levels: {
            A: "Explique précisément pourquoi, quand et comment l'IA a été utilisée, avec des exemples concrets et détaillés à l'appui.",
            B: "Justifie l'usage de l'IA de façon correcte mais assez générale, sans grand détail.",
            C: "La justification est vague ou se limite à une déclaration générale sans exemple concret.",
            D: "Aucune justification fournie, ou usage de l'IA non mentionné alors qu'il est observable dans le rendu.",
          },
        },
        {
          id: "ai_critical",
          title: "Esprit critique face à l'IA",
          max: 3,
          levels: {
            A: "Au moins un exemple documenté de correction ou de rejet d'une proposition de l'IA, avec analyse des limites ou biais identifiés.",
            B: "Mentionne avoir vérifié ou ajusté les sorties de l'IA, sans documentation détaillée du processus.",
            C: "Accepte largement les sorties de l'IA sans les questionner, avec de rares nuances apportées.",
            D: "Aucune trace d'esprit critique ; les sorties de l'IA sont reprises telles quelles, sans aucune vérification.",
          },
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

  function allCriteria() {
    return rubric.flatMap((s) => s.criteria);
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
      levels: {},
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

  function levelToPoints(level, max) {
    if (!level || !LEVEL_MID[level]) return 0;
    return Math.round(max * LEVEL_MID[level] * 10) / 10;
  }

  function computeTotals(state) {
    const bySection = {};
    let filled = 0;
    const totalCriteria = allCriteria().length;

    for (const section of rubric) {
      let sum = 0;
      for (const c of section.criteria) {
        const lvl = state.levels[c.id];
        if (lvl) filled += 1;
        sum += levelToPoints(lvl, c.max);
      }
      bySection[section.id] = Math.round(sum * 10) / 10;
    }

    const total = Object.values(bySection).reduce((a, b) => a + b, 0);
    return {
      bySection,
      total: Math.round(total * 10) / 10,
      filled,
      totalCriteria,
      complete: filled === totalCriteria,
    };
  }

  function toScoreOutOf20(totalOn100) {
    return Math.round((totalOn100 / 100) * 20 * 10) / 10;
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
        <div class="pill" title="Niveaux renseignés dans cette section">
          <span>Renseignés</span>
          <strong><span data-section-filled="${section.id}">0</span> / ${section.criteria.length}</strong>
        </div>
      `;
      sectionEl.appendChild(head);

      for (const c of section.criteria) {
        const selected = state.levels[c.id] ?? "";
        const note = state.notes[c.id] ?? "";
        const converted = selected ? levelToPoints(selected, c.max) : null;

        const criterionEl = document.createElement("article");
        criterionEl.className = "criterion";
        criterionEl.dataset.criterionId = c.id;

        const hintHtml = c.hint
          ? `<p class="small muted comp-hint">${escapeHtml(c.hint)}</p>`
          : "";

        const levelButtons = LEVELS.map(
          (lvl) => `
            <button
              type="button"
              class="level-btn lvl-${lvl.toLowerCase()}${selected === lvl ? " is-selected" : ""}"
              data-level-btn="${c.id}"
              data-level="${lvl}"
              aria-pressed="${selected === lvl ? "true" : "false"}"
              title="${LEVEL_LABELS[lvl]}"
            >
              <span class="level-btn-letter">${lvl}</span>
              <span class="level-btn-label">${LEVEL_LABELS[lvl]}</span>
            </button>
          `
        ).join("");

        const descriptor = selected
          ? `<div class="level-descriptor lvl-${selected.toLowerCase()}">
              <strong>Niveau ${selected} — ${LEVEL_LABELS[selected]}</strong>
              <p>${escapeHtml(c.levels[selected])}</p>
            </div>`
          : `<div class="level-descriptor level-descriptor-empty small muted">
              Sélectionnez un niveau A, B, C ou D pour afficher le descripteur correspondant.
            </div>`;

        criterionEl.innerHTML = `
          <div class="criterion-head">
            <div>
              <h4 class="criterion-title">${c.title}</h4>
              <div class="small muted">${section.title}</div>
              ${hintHtml}
            </div>
            <div class="criterion-meta">
              <span class="tag tag-max">Poids : ${c.max} pts</span>
              ${
                converted !== null
                  ? `<span class="tag tag-converted" data-converted-tag="${c.id}">≈ ${converted} pts</span>`
                  : `<span class="tag tag-converted" data-converted-tag="${c.id}" hidden>—</span>`
              }
            </div>
          </div>

          <div class="level-picker" role="group" aria-label="Niveau pour ${escapeHtml(c.title)}">
            ${levelButtons}
          </div>

          ${descriptor}

          <label class="field comp-note-field">
            <span>Observations (critère)</span>
            <textarea rows="2" data-note-input="${c.id}" placeholder="Notes / justifications…">${escapeHtml(note)}</textarea>
          </label>
        `;

        sectionEl.appendChild(criterionEl);
      }

      mount.appendChild(sectionEl);
    }
  }

  function renderReferenceTable(mount) {
    const rows = rubric
      .flatMap((section) =>
        section.criteria.map((c, i) => {
          const axeCell =
            i === 0
              ? `<td class="axe-cell" rowspan="${section.criteria.length}">${section.title}</td>`
              : "";
          if (i > 0) {
            return `
              <tr>
                <td class="crit-cell">${c.title}<span class="max">/${c.max} pts</span></td>
                ${LEVELS.map((lvl) => `<td class="lvl-${lvl.toLowerCase()}">${escapeHtml(c.levels[lvl])}</td>`).join("")}
              </tr>`;
          }
          return `
            <tr>
              ${axeCell}
              <td class="crit-cell">${c.title}<span class="max">/${c.max} pts</span></td>
              ${LEVELS.map((lvl) => `<td class="lvl-${lvl.toLowerCase()}">${escapeHtml(c.levels[lvl])}</td>`).join("")}
            </tr>`;
        })
      )
      .join("");

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
      </div>`;
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
          <tbody>${rows}</tbody>
        </table>
      </div>
    `;
  }

  function updateTotalsUI(state) {
    const { bySection, total, filled, totalCriteria, complete } = computeTotals(state);

    for (const section of rubric) {
      const sectionFilled = section.criteria.filter((c) => state.levels[c.id]).length;
      const el = document.querySelector(`[data-section-filled="${section.id}"]`);
      if (el) el.textContent = String(sectionFilled);
    }

    const filledEl = $("#levelsFilled");
    if (filledEl) filledEl.textContent = `${filled} / ${totalCriteria}`;

    const totalScore = $("#totalScore");
    const totalScore20 = $("#totalScore20");
    const scoreHint = $("#scoreHint");

    if (totalScore) {
      totalScore.textContent = complete ? String(total) : "—";
    }
    if (totalScore20) {
      totalScore20.textContent = complete ? String(toScoreOutOf20(total)) : "—";
    }
    if (scoreHint) {
      scoreHint.textContent = complete
        ? "Conversion optionnelle (milieu de fourchette A–D)"
        : `${totalCriteria - filled} critère(s) restant(s) pour calculer le score converti`;
    }

    const pbar = $("#totalProgress");
    const prog = $(".progress");
    const pct = totalCriteria ? (filled / totalCriteria) * 100 : 0;
    if (pbar) pbar.style.width = `${pct}%`;
    if (prog) prog.setAttribute("aria-valuenow", String(Math.round(pct)));
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
    state.levels = fresh.levels;
    state.notes = fresh.notes;
    localStorage.removeItem(STORAGE_KEY);
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
    const a = document.createElement("a");
    a.href = url;
    const base = (state.meta.projectName || "grille-competences").trim().replaceAll(/\s+/g, "_");
    a.download = `${base || "grille-competences"}_${new Date().toISOString().slice(0, 10)}.json`;
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

    const totals = computeTotals(state);
    const baseName = (state.meta.projectName || "grille-competences")
      .trim()
      .replaceAll(/\s+/g, "_")
      .slice(0, 60);

    const wb = XLSX.utils.book_new();

    const summaryRows = [
      ["Axe", "Niveaux renseignés", "Score converti", "Max"],
      ...rubric.map((s) => {
        const filled = s.criteria.filter((c) => state.levels[c.id]).length;
        return [s.title, `${filled}/${s.criteria.length}`, totals.bySection[s.id] ?? 0, s.max];
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
      for (const c of section.criteria) {
        const lvl = state.levels[c.id] ?? "";
        const pts = lvl ? levelToPoints(lvl, c.max) : "";
        detailRows.push([
          section.title,
          c.title,
          lvl,
          lvl ? LEVEL_LABELS[lvl] : "",
          pts,
          c.max,
          lvl ? c.levels[lvl] : "",
          String(state.notes[c.id] ?? ""),
        ]);
      }
    }
    const wsDetails = XLSX.utils.aoa_to_sheet(detailRows);
    wsDetails["!cols"] = [
      { wch: 26 }, { wch: 32 }, { wch: 6 }, { wch: 22 },
      { wch: 10 }, { wch: 6 }, { wch: 52 }, { wch: 40 },
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

    const filename = `${baseName || "grille-competences"}_${new Date().toISOString().slice(0, 10)}.xlsx`;
    XLSX.writeFile(wb, filename);
    return true;
  }

  function setLevel(state, criterionId, level) {
    const crit = allCriteria().find((c) => c.id === criterionId);
    if (!crit) return;

    const current = state.levels[criterionId];
    state.levels[criterionId] = current === level ? "" : level;

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
        state.meta.scope = $$('input[name="scope"]:checked', metaForm).map((x) => x.value);
        saveState(state);
      });
    }

    if (teacherNotes) {
      teacherNotes.addEventListener("input", () => {
        state.meta.teacherNotes = teacherNotes.value;
        saveState(state);
      });
    }

    document.addEventListener("click", (e) => {
      const t = e.target;
      if (!(t instanceof HTMLElement)) return;
      const btn = t.closest("[data-level-btn]");
      if (!btn) return;
      const id = btn.getAttribute("data-level-btn");
      const level = btn.getAttribute("data-level");
      if (!id || !level) return;
      setLevel(state, id, level);
    });

    document.addEventListener("input", (e) => {
      const t = e.target;
      if (!(t instanceof HTMLElement)) return;
      if (t.matches("[data-note-input]")) {
        const id = t.getAttribute("data-note-input");
        if (!id) return;
        state.notes[id] = /** @type {HTMLTextAreaElement} */ (t).value;
        saveState(state);
      }
    });

    $("#btnSubmit")?.addEventListener("click", () => {
      downloadJson(state);
      resetForm(state);
    });

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
      const ok = confirm("Réinitialiser toutes les données (niveaux, champs, observations) ?");
      if (!ok) return;
      resetForm(state);
    });

    $("#btnToggleRef")?.addEventListener("click", () => {
      const panel = $("#refPanel");
      const btn = $("#btnToggleRef");
      if (!panel || !btn) return;
      const hidden = panel.hidden;
      panel.hidden = !hidden;
      btn.setAttribute("aria-expanded", hidden ? "true" : "false");
      btn.textContent = hidden ? "Masquer le référentiel complet" : "Afficher le référentiel complet";
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
