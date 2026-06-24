/* eslint-disable no-alert */
(() => {
  const STORAGE_KEY = "edueval-ai-rubric:v1";

  const rubric = [
    {
      id: "tech",
      title: "1. Technical mastery",
      max: 40,
      criteria: [
        {
          id: "tech_func",
          title: "Expected features",
          max: 30,
          bloom: "Apply",
          description: "Correct and complete implementation of the required features.",
          indicators: [
            "All specification features are present, testable, and functional without critical errors.",
          ],
          evidence: ["Git history (commits)", "Defense demo", "Tests run/passed"],
        },
        {
          id: "tech_understand",
          title: "Technical understanding",
          max: 10,
          bloom: "Understand → Analyze",
          description: "Ability to explain how the project works, technical choices, and architecture.",
          indicators: [
            "Precise answers to instructor questions; justified library and architecture choices.",
          ],
          evidence: ["Short oral defense", "Written technical justification", "Architecture diagram"],
        },
      ],
    },
    {
      id: "quality",
      title: "2. Performance & project quality",
      max: 30,
      criteria: [
        {
          id: "quality_code",
          title: "Overall code and project quality",
          max: 15,
          bloom: "Analyze",
          description: "Stability, consistency, no major bugs, readable and maintainable code.",
          indicators: ["Structured, commented code; no console errors in production; consistent naming."],
          evidence: ["Code review (screenshot or share)", "Completed README", "No critical errors in demo"],
        },
        {
          id: "quality_ux",
          title: "User experience (UX/UI)",
          max: 15,
          bloom: "Analyze → Create",
          description: "Logical navigation, ergonomics, fluidity, and interface clarity.",
          indicators: [
            "A new user can use the interface without help; error states are handled.",
          ],
          evidence: ["Annotated screenshot", "User test scenario", "Peer feedback"],
        },
      ],
    },
    {
      id: "engagement",
      title: "3. Engagement & work process",
      max: 20,
      criteria: [
        {
          id: "eng_collab",
          title: "Collaboration tools (Git, GitHub Projects…)",
          max: 8,
          bloom: "Apply → Evaluate",
          description: "Regular commits with clear messages, traceable progress, visible collaboration.",
          indicators: ["≥ 1 commit per session, descriptive messages, branches used for group work."],
          evidence: ["Public Git history", "GitHub Projects / Issues", "Contribution logs"],
        },
        {
          id: "eng_autonomy",
          title: "Autonomy & initiative",
          max: 6,
          bloom: "Create",
          description: "Independent research, problem-solving without constant external help, initiative.",
          indicators: ["Unspecified problems solved, bonus features added."],
          evidence: ["Work log", "Research history", "Oral interview"],
        },
        {
          id: "eng_plan",
          title: "Organization & planning",
          max: 6,
          bloom: "Evaluate",
          description: "Task structuring, milestone adherence, and time management.",
          indicators: ["Initial plan followed, GitHub tickets closed on time, no empty sprints."],
          evidence: ["Product board (GitHub)", "Milestones met", "Work log"],
        },
      ],
    },
    {
      id: "ai",
      title: "4. Generative AI usage",
      max: 10,
      criteria: [
        {
          id: "ai_level",
          title: "AI usage level (scale 1–5)",
          max: 4,
          bloom: "Analyze",
          description: "Consistency between declared level, observed usage, and deliverables.",
          indicators: ["Declared level backed by evidence (screenshots, logs). No gap between claims and practice."],
          evidence: ["AI exchange screenshots", "Prompt logs", "Oral interview"],
        },
        {
          id: "ai_justify",
          title: "Justification of AI usage",
          max: 3,
          bloom: "Understand → Analyze",
          description: "Ability to explain why, when, and how AI was used.",
          indicators: [
            "Specific examples (“I used ChatGPT to generate X because…”).",
          ],
          evidence: ["Reflective work log", "“AI usage” section in README", "Oral defense"],
        },
        {
          id: "ai_critical",
          title: "Critical thinking toward AI output",
          max: 3,
          bloom: "Evaluate",
          description: "Ability to detect errors, limits, biases, and correct AI suggestions.",
          indicators: [
            "At least one documented example of correcting/rejecting an AI response; student does not blindly accept output.",
          ],
          evidence: ["Before/after AI correction screenshot", "Explicit code comment", "Defense: critical question"],
        },
      ],
    },
  ];

  const iaScale = [
    {
      level: "N1",
      label: "No AI",
      behaviors:
        "No AI tools used. The student works only with human resources and standard documentation.",
      evidence: "Written declaration + no mention of AI in the work log.",
    },
    {
      level: "N2",
      label: "Preparation with AI",
      behaviors:
        "AI used for ideation, research, brainstorming. The student then rewrites in their own words.",
      evidence: "Screenshots of research prompts; pre-writing sections in the work log.",
    },
    {
      level: "N3",
      label: "Collaboration with AI",
      behaviors:
        "AI as assistant: code generation, text improvement, correction. The student reviews and adjusts every output.",
      evidence:
        "Log of AI exchanges (ChatGPT, Copilot…); items showing AI origin and corrections made.",
    },
    {
      level: "N4",
      label: "Full AI integration",
      behaviors:
        "AI integrated at every stage. The student orchestrates tools, chooses models, and assesses limits.",
      evidence:
        "Detailed pipeline (which tool, at which stage); examples of rejected/corrected AI outputs; oral defense.",
    },
    {
      level: "N5",
      label: "Creative exploration with AI",
      behaviors:
        "AI used innovatively and reflectively. The student questions biases, documents experiments, creates new usages.",
      evidence:
        "Reflective report on AI usage; documented experiments; examples of creative or critical repurposing.",
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
    if (el) el.textContent = `Saved at ${new Date().toLocaleTimeString()}`;
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
        <div class="pill" title="Section total">
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
              <div style="margin-top:8px"><b>Indicators:</b></div>
              <ul>
                ${c.indicators.map((x) => `<li>${x}</li>`).join("")}
              </ul>
              <div style="margin-top:8px"><b>Expected evidence:</b></div>
              <ul>
                ${c.evidence.map((x) => `<li>${x}</li>`).join("")}
              </ul>
            </div>

            <div class="inputs">
              <div class="score-input">
                <div>
                  <div class="label2">Score</div>
                  <div class="small muted">0 to ${c.max}</div>
                </div>
                <input
                  type="number"
                  inputmode="numeric"
                  min="0"
                  max="${c.max}"
                  step="0.5"
                  value="${current}"
                  aria-label="Score for ${c.title}"
                  data-score-input="${c.id}"
                />
              </div>
              <label class="field">
                <span>Observations (criterion)</span>
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
      <div class="ia-table-wrap" role="region" aria-label="Indicative AI usage scale table">
        <table class="ia-table">
          <thead>
            <tr>
              <th>Level</th>
              <th>Label</th>
              <th>Observable behaviors</th>
              <th>Expected evidence</th>
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
    if (el) el.textContent = "Form reset — ready for next evaluation";
  }

  function downloadJson(state) {
    const { bySection, total } = computeTotals(state);
    const payload = {
      exportedAt: new Date().toISOString(),
      meta: state.meta,
      scores: state.scores,
      notes: state.notes,
      totals: { bySection, total, totalOn20: toScoreOutOf20(total) },
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const base = (state.meta.projectName || "evaluation-rubric").trim().replaceAll(/\s+/g, "_");
    a.download = `${base || "evaluation-rubric"}_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  function downloadExcel(state) {
    const XLSX = /** @type {any} */ (globalThis.XLSX);
    if (!XLSX) {
      alert("Excel export unavailable (XLSX library not loaded). Check your internet connection.");
      return false;
    }

    const { bySection, total } = computeTotals(state);
    const baseName = (state.meta.projectName || "evaluation-rubric")
      .trim()
      .replaceAll(/\s+/g, "_")
      .slice(0, 60);

    const wb = XLSX.utils.book_new();

    const summaryRows = [
      ["Axis", "Score", "Max"],
      ["Technical mastery", bySection.tech ?? 0, 40],
      ["Performance & quality", bySection.quality ?? 0, 30],
      ["Engagement", bySection.engagement ?? 0, 20],
      ["AI usage", bySection.ai ?? 0, 10],
      ["TOTAL (/100)", total, 100],
      ["TOTAL (/20)", toScoreOutOf20(total), 20],
    ];
    const wsSummary = XLSX.utils.aoa_to_sheet(summaryRows);
    wsSummary["!cols"] = [{ wch: 26 }, { wch: 10 }, { wch: 8 }];
    XLSX.utils.book_append_sheet(wb, wsSummary, "Summary");

    const detailHeader = ["Axis", "Criterion", "Bloom", "Score", "Max", "Description", "Indicators", "Evidence", "Observations"];
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
    XLSX.utils.book_append_sheet(wb, wsDetails, "Details");

    const metaRows = [
      ["Field", "Value"],
      ["Project", state.meta.projectName ?? ""],
      ["Mode", state.meta.mode ?? ""],
      ["Student(s)", state.meta.student ?? ""],
      ["GitHub link", state.meta.github ?? ""],
      ["Validation date", state.meta.date ?? ""],
      ["Scope", (state.meta.scope ?? []).join(", ")],
      ["Instructor observations", state.meta.teacherNotes ?? ""],
      ["Exported on", new Date().toLocaleString()],
    ];
    const wsMeta = XLSX.utils.aoa_to_sheet(metaRows);
    wsMeta["!cols"] = [{ wch: 26 }, { wch: 60 }];
    XLSX.utils.book_append_sheet(wb, wsMeta, "Meta");

    const filename = `${baseName || "evaluation-rubric"}_${new Date().toISOString().slice(0, 10)}.xlsx`;
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
      const ok = confirm("Reset all data (scores, fields, observations)?");
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
