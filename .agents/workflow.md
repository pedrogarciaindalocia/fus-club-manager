 
# 📈 Orchestrated Workflow for **fus‑dashboard** Agents

> This document defines a **coherent and efficient** end‑to‑end process that synchronises the orchestrated agents (Architecte Solution, Développeur Front‑end, Développeur Backend, Intégrateur UI/UX, Auditeur & Optimiseur Supabase, Testeur QA, Chef de projet, Responsable Déploiement GitHub). All artefacts are stored in the Antigravity brain directory so any agent can retrieve them via `view_file`.

---

## 1️⃣ Project Kick‑off (Chef de projet)
1. **Create user story** – `user_story_<id>.md` containing:
   - Description, acceptance criteria, *Definition of Done*.
   - Priority and story points.
2. **Publish** the story in the backlog artifact `backlog.md`.
3. **Notify** the **Architecte Solution** (`@architect_solution`) with a prompt referencing the new story.

---

## 2️⃣ Architecture Design (Architecte Solution)
1. **Read** the user story artifact.
2. **Produce**:
   - `architecture_diagram.mermaid`
   - `architecture_notes.md`
   - High‑level data model (`data_model.mermaid`).
3. **Store** artefacts via `write_to_file`.
4. **Update** `project_status.md` with *"Architecture ready"*.
5. **Hand‑off** to **Développeur Backend** and **Développeur Front‑end** using the sub‑agent prompt:
   ```text
   @backend_developer
   Build the Supabase schema based on the attached architecture notes.
   @front_end_developer
   Start UI scaffolding using the same notes.
   ```

---

## 3️⃣ Backend Implementation (Développeur Backend)
1. **Read** `architecture_notes.md` and `data_model.mermaid`.
2. **Create**:
   - `supabase_schema.sql`
   - `supabase_rls.sql`
   - `supabase_rpc.sql`
3. **Deploy** the schema to the Supabase project (via Supabase CLI).
4. **Write** `backend_schema.md` summarising tables, RLS, and RPCs.
5. **Update** `project_status.md` with *"Backend ready"*.
6. **Notify** the **Front‑end** and **UI/UX** agents.

---

## 4️⃣ UI/UX Design (Intégrateur UI/UX)
1. **Consume** `architecture_notes.md` and any early UI sketches.
2. **Deliver**:
   - `design_system.md` (palette, typography, Tailwind tokens).
   - `ui_mockup_v1.png` (high‑fidelity mock‑up).
   - `animations_spec.md` (framer‑motion guidelines).
   - `accessibility_checklist.md`.
3. **Store** artefacts and set status *"Design ready"*.
4. **Signal** the **Front‑end** to start implementation.

---

## 5️⃣ Front‑end Development (Développeur Front‑end)
1. **Read** `backend_schema.md`, `design_system.md`, and `ui_mockup_v1.png`.
2. **Create** component files in `src/components/` and hooks in `src/hooks/`.
3. **Integrate** chart libraries (`chart.js`, `recharts`).
4. **Commit** a UI showcase artifact `ui_components.md` describing each component.
5. **Mark** progress in `project_status.md` as *"Front‑end prototype ready"*.
6. **Request** UI/UX review for visual fidelity and notify `@supabase-usage-optimizer` before QA whenever Supabase queries, Storage, Realtime, or Auth flows are added or modified.

---

## 6️⃣ Audit & Optimisation Quotas Supabase (Auditeur Supabase)
1. **Read** `backend_schema.md`, SQL migrations (`supabase_schema.sql`, `supabase_rls.sql`, `supabase_rpc.sql`), and scan frontend/hooks code (`.from(`, `.rpc(`, `.storage`, `.channel(`, `.auth.`).
2. **Audit** the 5 Supabase Free Plan metrics: **Egress** (avoid `select('*')`, enforce pagination & `staleTime`, filter/clean Realtime channels), **Database Size**, **File Storage** (pre-upload compression, orphan cleanup, `cacheControl`), **MAU** (`getSession()` vs `getUser()`, auth loops), and **Log Ingestion & Log Query** (no polling loops, silent 4xx/5xx retries, or verbose Edge Function logs).
3. **Produce** the structured audit report `supabase_usage_audit.md` (efficiency score, `[CRITIQUE]`/`[MOYEN]`/`[FAIBLE]` issues with before/after snippets, SQL & architecture recommendations).
4. **Update** `project_status.md` with *"Supabase quota audit complete"*.
5. **If `[CRITIQUE]` issues are found**, route fixes back to `@backend_developer` and/or `@front_end_developer` before entering QA.

---

## 7️⃣ QA & Validation (Testeur QA)
1. **Read** all artefacts: architecture, backend, UI components, design system, and `supabase_usage_audit.md`.
2. **Generate** `test_plan.md` covering:
   - Functional/e2e tests (Playwright/Detox).
   - Performance benchmarks.
   - Security/RLS checks.
   - Accessibility audits.
3. **Implement** tests in `e2e_tests/`.
4. **Execute** the suite and capture results in `qa_report.md` (screenshots, timings, failures).
5. **Log** any security or RLS issues in `security_issues.md`.
6. **Update** `project_status.md` with *"QA complete – pass/fail"*.
7. **If failures**, use `ask_question` to clarify with the responsible agent (Backend or Front‑end).

---

## 8️⃣ Review & Release (Chef de projet)
1. **Review** artefacts: architecture, design system, UI components, `supabase_usage_audit.md`, QA report.
2. **Approve** or **request changes** (loop back to the appropriate agent).
3. Once approved, **create** `release_notes.md` summarising new features and migrations.
4. **Trigger** the CI/CD pipeline (`@github_deployer`, represented as artefact `ci_pipeline.md`).
5. **Mark** the sprint as **Done** in `project_status.md`.

---

## 9️⃣ Continuous Feedback Loop
- After each sprint, the **Chef de projet** runs a **retrospective** and updates `process_improvements.md`.
- All agents read this file at the start of the next sprint to incorporate lessons learned.

---

### Artifact Naming Conventions (summary)
```
user_story_<id>.md
architecture_diagram.mermaid
architecture_notes.md
data_model.mermaid
supabase_schema.sql
supabase_rls.sql
supabase_rpc.sql
backend_schema.md
design_system.md
ui_mockup_v1.png
animations_spec.md
accessibility_checklist.md
ui_components.md
supabase_usage_audit.md
test_plan.md
qa_report.md
security_issues.md
project_status.md
release_notes.md
process_improvements.md
```

---

### How to start the workflow
```text
@project_owner
Start a new sprint with user stories listed in `backlog.md`.
```

**Calling other agents via `@`**
```text
@architect_solution
Design the high‑level data model and generate `data_model.mermaid` and `supabase_schema.sql`.

@backend_developer
Create the Supabase tables and RLS policies based on the architecture notes.

@ui_ux_integrator
Produce the UI design system (`design_system.md`) and high‑fidelity mock‑up.

@front_end_developer
Implement the navigation bar and integrate the design system.

@supabase-usage-optimizer
Auditer les requêtes Supabase (frontend, hooks, Storage, Realtime) et les migrations SQL pour optimiser les quotas (Egress, DB, Storage, MAU, Logs) et générer `supabase_usage_audit.md`.

@qa_tester
Run the end‑to‑end test suite and generate `qa_report.md`.

@github_deployer
Vérifier le build, sécuriser les variables d'environnement (Mapbox, Supabase) et déployer sur GitHub / Netlify.
```

These `@` mentions can be placed anywhere in an artifact (e.g., `workflow.md`, `backlog.md`, or a user story). The referenced agent will read its `SKILL.md` prompt template, substitute the text after the mention as the **goal**, and produce the required artefacts.

The Project Owner creates the first `user_story_*.md` and the chain above automatically propagates through the agents.

---

*Place this file at `fus-dashboard/.agents/workflow.md` for reference.*
