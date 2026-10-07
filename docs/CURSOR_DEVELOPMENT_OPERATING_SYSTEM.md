# CURSOR DEVELOPMENT OPERATING SYSTEM — MASTER FILE
## General reusable standard for any software project
### Version: 2026-08-27

> **Purpose**
>
> This single file defines the complete Cursor-based development operating system:
>
> - how Cursor should orchestrate work;
> - how Spec Kit is used;
> - what repository workflow files should exist and what each contains;
> - how OpenCode, Codex, Playwright, Explore, auditors, and verifiers are used;
> - how models are routed;
> - how context and cost are controlled;
> - how real E2E, multi-actor verification, false-completion checks, and convergence work;
> - how a new repository should be bootstrapped safely.
>
> This standard is **generic**. It is not tied to IMKAN, People, Zoho, OMA, or any specific product or framework.

---

# 1. CORE OPERATING MODEL

Cursor is the **orchestrator**.

Cursor is responsible for understanding the request, routing context, selecting the correct tool/worker/model, reviewing the result, verifying the real journey, and deciding whether the work is actually complete.

Cursor is **not required to write all code itself**.

The permanent development lifecycle is:

```text
USER REQUEST
        ↓
CURSOR PARENT AGENT
        ↓
TASK CLASSIFICATION
        ↓
CONTEXT ROUTER
        ↓
AGENTS.md
+ CONSTITUTION
+ SMALLEST RELEVANT SPEC
+ REQUIRED SKILL ONLY
        ↓
CURRENT REPOSITORY INSPECTION
        ↓
SOURCE-OF-TRUTH / OWNERSHIP MAP
        ↓
BLOCKER DECISION GATE
        ↓
SPEC KIT
        ↓
PLAN
        ↓
TASKS
        ↓
SELECT CORRECT WORKER / MODEL / TOOL
        ↓
IMPLEMENT
        ↓
LOCAL VALIDATION
        ↓
PLAYWRIGHT REAL E2E
        ↓
INDEPENDENT AUDIT / VERIFIER
        ↓
FALSE-COMPLETION AUDIT
        ↓
CONVERGENCE
        ↓
SPEC SYNC
        ↓
FINAL REPORT
```

A worker saying `DONE` is **never** sufficient completion evidence. Completion requires evidence.

---

# 2. DEFAULT REPOSITORY WORKFLOW LAYER

For a new repository, use this development-control structure:

```text
<PROJECT_ROOT>/
│
├── README.md
├── AGENTS.md
├── .gitignore
│
├── docs/
│   ├── CURSOR_WORKFLOW.md
│   └── CODEX_HANDOFF.md
│
├── .specify/
│   └── memory/
│       └── constitution.md
│
├── specs/
│   └── <NNN-feature-name>/
│       ├── spec.md
│       ├── plan.md
│       ├── tasks.md
│       ├── research.md              # only when needed
│       ├── data-model.md            # only when needed
│       ├── contracts/               # only when needed
│       ├── quickstart.md            # only when needed
│       └── checklists/
│           └── requirements.md
│
├── .agents/
│   └── skills/
│       ├── spec-first/
│       │   └── SKILL.md
│       ├── deliver-change/
│       │   └── SKILL.md
│       └── verify-change/
│           └── SKILL.md
│
├── .cursor/
│   ├── rules/
│   │   └── orchestrator.mdc
│   └── agents/
│       ├── spec-auditor.md
│       └── verifier.md
│
├── .opencode/
│   └── agents/
│       ├── project-coder.md
│       └── browser-worker.md
│
├── scripts/
│   └── <project verification / e2e scripts>
│
└── .visual-reference/
    └── .gitkeep
```

Important:

- Preserve official Spec Kit managed files.
- Do not overwrite Spec Kit-generated templates, scripts, integration metadata, or `speckit-*` skills.
- These files complement Spec Kit; they do not replace it.
- Do not create dozens of empty feature specs at repository creation time.
- Start with the constitution and workflow layer, then create the **smallest relevant feature spec** when a real feature begins.

---

# 3. INFORMATION OWNERSHIP ACROSS WORKFLOW FILES

Avoid duplicating the same rules across many files.

```text
constitution.md
→ WHY / governing principles / hard delivery gates

AGENTS.md
→ durable rules every agent/worker must obey

CURSOR_WORKFLOW.md
→ HOW Cursor routes context, tools, workers, models, and verification

orchestrator.mdc
→ thin always-on Cursor enforcement/pointer

spec-first/SKILL.md
→ procedure for defining/changing behavior

deliver-change/SKILL.md
→ procedure for implementation

verify-change/SKILL.md
→ procedure for independent verification

spec-auditor.md
→ independent specification / SoT / permissions auditor

verifier.md
→ independent completion auditor

specs/
→ authoritative product truth for each feature

OpenCode worker
→ implementation role only

Codex handoff
→ high-capability coding contract

README.md
→ setup and usage entry point
```

---

# 4. AGENTS.md — DURABLE SHARED CONTRACT

`AGENTS.md` is the main durable contract shared by Cursor, OpenCode, Codex, and other coding workers.

Recommended content:

```markdown
# Project Agent Contract

This repository uses a spec-first, evidence-driven development workflow.

## Cursor is the orchestrator

Cursor coordinates the work.

Do not begin meaningful product implementation by immediately writing code.

Default lifecycle:

USER REQUEST
→ CLASSIFY
→ LOAD MINIMAL CONTEXT
→ INSPECT REPOSITORY
→ MAP OWNER / SOURCE OF TRUTH
→ RESOLVE MATERIAL BLOCKERS
→ SPECIFY
→ PLAN
→ TASKS
→ ROUTE WORK
→ IMPLEMENT
→ VERIFY
→ REAL E2E
→ INDEPENDENT REVIEW
→ FALSE-COMPLETION AUDIT
→ CONVERGE
→ SPEC SYNC
→ REPORT.

A worker saying "done" is not completion evidence.

## Spec-first

Before changing intended product behavior:

- read the constitution;
- read the smallest relevant spec;
- update or create the smallest relevant Spec Kit feature specification;
- resolve material ambiguity before technical planning.

Specifications define WHAT and WHY.
Technical plans define HOW.
Do not hide unresolved product decisions inside implementation.

## One source of truth

For every important domain or fact identify:

- logical owner;
- physical storage owner;
- authoritative writer;
- permitted readers;
- tenant boundary;
- permission/capability gate;
- emitted events;
- downstream consumers.

Before creating a new service, table, registry, permission system, notification system,
workflow system, audit system, file store, identity model, or event system:
search for the existing canonical owner.

## Repository first

Inspect actual repository state before architecture or implementation.

Check:
framework and versions, package manager, scripts, database/migrations, auth,
tenant architecture, permissions, existing services, tests, E2E/browser infrastructure,
and dirty worktree state.

Do not invent architecture from assumptions.

## Server authority

Authorization must be server-authoritative:

AUTHENTICATION
+
TENANT
+
CAPABILITY / PERMISSION
+
RECORD SCOPE
+
VALID STATE / ACTION.

Client-provided IDs never grant authority by themselves.
Deny by default.

## Persistence

Permanent product state must use the project's canonical persistence/schema mechanism.

No hidden runtime-only permanent schema.
No frontend-only persistence presented as durable state.
No destructive database reset unless explicitly authorized.

## Complete journeys

For persistent functionality prove:

ACTION
→ REQUEST/API
→ AUTHORIZATION
→ DATABASE / AUTHORITATIVE INTEGRATION
→ RESPONSE
→ UI
→ REFRESH
→ RELOGIN
→ SAME AUTHORITATIVE STATE.

## Multi-actor journeys

When multiple roles participate:

ACTOR A ACTION
→ PERSIST
→ ACTOR B SEES ACCORDING TO PERMISSION
→ ACTOR B ACTS
→ ACTOR A SEES AUTHORITATIVE RESULT.

Do not test a multi-role journey only through one super-admin account.

## Failure and safety

Where applicable test:
validation, permission denial, cross-tenant denial, not found, network/API failure,
duplicate submission, retry, idempotency, concurrency, stale writes, conflicts,
partial failure, loading, empty, and error states.

## False completion

Before claiming completion verify:
- no blocking TODO/FIXME;
- no mocks pretending to be production behavior;
- no fake persisted data;
- no dead buttons;
- no stub APIs;
- no fake success;
- no client-only security;
- no hidden duplicate source of truth;
- required DB changes actually exist;
- refresh/relogin preserve state;
- permissions and tenant isolation are real;
- required UI is actually wired;
- required tests/E2E pass.

## Context control

Load the smallest relevant context.
Do not load the full repository or full product specification into every task.
Load skills on demand.

## Agent control

Start with zero subagents.
Use one focused worker for one coherent implementation slice.
Use a second agent only for independent verification/research when justified.
Default maximum active subagents: 2.
Never fan out several models/agents to solve the same ordinary task.

## Worker conflict

Before parallel write work inspect current worktree and file ownership.
Do not allow two writers to modify overlapping shared files.

If a real overlap exists:
PARALLEL_WORK_CONFLICT

Stop one implementation stream.
Never overwrite unrelated uncommitted work.

## Model usage

Model selection is task-based.
Default premium-model usage is zero.

Normal implementation → OpenCode.
Complex coding/debugging/high-fidelity implementation → Codex when justified.
Mechanical changes → Composer when useful.
Product/UX → Fable only when needed.
Architecture / difficult SoT → Sol only when needed.
Exceptional frontend difficulty → Sonnet only when needed.
Visual second opinion → Gemini only when useful.
Rare adversarial review → Opus.
Targeted research → Grok where useful.
Browser/E2E → Playwright / Browser Worker.

Playwright is not an AI model.

Premium models reason over prepared evidence.
They do not collect broad evidence by default.

## External actions

Do not perform destructive, spend-bearing, production-publishing,
credential-changing, or external-account mutations without the authorization
required by the project.

Never request secrets in chat or commit them to the repository.

## Completion

A change is complete only when:

SPEC
PLAN
TASKS
CODE
DATABASE
API
UI
TESTS
E2E
INTEGRATIONS
DOCUMENTATION

agree on the implemented behavior.

Otherwise report PARTIAL or BLOCKED with exact remaining work.
```

---

# 5. CONSTITUTION — GOVERNING PRINCIPLES

Path:

```text
.specify/memory/constitution.md
```

Recommended content:

```markdown
# Project Constitution

## I. Product behavior is specified before implementation

Define before implementation:
- intended outcome;
- actors;
- permissions;
- lifecycle;
- state transitions;
- failure behavior;
- acceptance evidence.

Update the smallest relevant specification before intentionally changing product behavior.

No implementation while a material unresolved decision would change behavior,
architecture, security, cost, ownership, or external actions.

## II. One owner and one source of truth

Every shared fact must identify:
- logical owner;
- physical owner;
- authoritative writer;
- readers;
- tenant boundary;
- permission gate;
- events;
- consumers.

Cross-module visibility does not transfer ownership.
Reject unexplained duplicate sources of truth.

## III. Tenant isolation and least privilege

Tenant/company context must be resolved server-side.
Client data is not authorization.

Apply tenant and permission checks to reads, writes, search, export, uploads,
background jobs, notifications, webhooks, and external actions.

Deny by default.
Privileged actions must be auditable.

## IV. Durable state is authoritative

Durable product state must use the repository's canonical persistence system.

No fake frontend persistence.
No permanent runtime-only schema authority.
No destructive reset without explicit authorization.

## V. State transitions are explicit

Important records must have explicit allowed transitions.

Reject stale transitions, invalid transitions, repeated final actions, and unauthorized transitions.

Concurrency and idempotency must be handled where relevant.

## VI. Integrations preserve ownership

An external system remains authoritative for facts it owns.

Do not silently copy and diverge external state.

External integration journeys must address:
authorization, failure, expiry, retries, duplicate events, out-of-order events,
partial success, and reconciliation.

## VII. Human authority over consequential AI/external actions

AI may propose.
AI must not silently approve or execute consequential actions where accountable
human authorization is required.

Retain appropriate provenance and decision history where AI is part of the product.

## VIII. Real E2E is part of correctness

Persistent functionality must prove:

Action
→ Request
→ Authorization
→ Durable mutation/integration
→ Response
→ UI
→ Refresh/Re-login
→ Persisted result.

Mock-only success is insufficient.

## IX. Accessible product behavior is correctness

Where applicable verify:
supported languages, LTR/RTL, responsive layouts, keyboard, focus, contrast,
non-color status, loading, empty, error, stale, conflict, denied states,
deep links, refresh/re-login, and Back/Forward behavior.

## X. Completion is evidence, not assertion

"Done" requires proof.

Relevant verification includes:
lint, typecheck, unit/integration tests, build, browser E2E, tenant/role boundaries,
invalid/concurrent transitions, duplicate/idempotency tests, notifications/deep links,
external failure, false-completion audit, and spec/code/test convergence.

Never report NOT TESTED as PASS.

## XI. Scope, agents, context, and cost remain controlled

Prefer the smallest coherent change.
Start with the parent agent.
Default maximum active subagents: 2.
Do not parallelize the same task merely to manufacture confidence.
Inspect installed tools before installing anything.
Do not hard-pin premium models by default.
Protect unrelated worktree changes.
Premium models consume prepared evidence, not broad repository/browser loops.

## XII. Specifications evolve with implementation

Keep one authoritative artifact for each behavior.

Record decisions, superseded behavior, deferred scope, evidence, and accepted limitations.

After implementation synchronize durable behavior with the smallest affected spec.

Do not modify managed Spec Kit templates to store product truth.

# Delivery Gates

## Gate A — Definition Ready
- outcome is clear;
- actors are clear;
- requirements are testable;
- non-goals are explicit;
- material ambiguity is resolved or blocked.

## Gate B — Architecture Ready
- repository inspected;
- SoT map understood;
- tenant and permissions explicit;
- persistence/migration explicit;
- integration/failure strategy explicit.

## Gate C — Tasks Ready
- tasks dependency ordered;
- bounded;
- independently verifiable;
- requirements/acceptance mapped;
- testing and E2E included.

## Gate D — Implementation Ready for Review
- targeted checks pass;
- no unrelated architecture;
- no secrets;
- no placeholders pretending to work;
- real journey evidence exists.

## Gate E — Converged
- spec;
- plan;
- tasks;
- code;
- tests;
- UI;
- integration behavior

agree.

False-completion audit passes.
Remaining limitations are explicit.
```

---

# 6. CURSOR WORKFLOW FILE

Path:

```text
docs/CURSOR_WORKFLOW.md
```

This file owns the operational routing:

```markdown
# Cursor Development Workflow

## Purpose

Cursor is the thin orchestration layer.

Product truth lives in Spec Kit.
Durable shared rules live in AGENTS.md and the constitution.
Repeatable procedures live in .agents/skills/.
Implementation may be delegated to specialized workers.

## Task Modes

SETUP_ONLY
→ repository/tooling/workflow setup only; no product implementation.

SPEC_ONLY
→ define/change intended behavior; no product code.

IMPLEMENT
→ approved specification/plan/tasks exist; implement bounded work.

BUG
→ reproduce incorrect behavior, find root cause, apply smallest safe fix,
add regression proof.

REVIEW
→ validate a change/completion claim; default read-only.

## Task Categories

MECHANICAL
FEATURE
DOMAIN
ARCHITECTURE
DEBUGGING
RESEARCH
VISUAL
TEST_REGRESSION

The category controls context and routing.

## Cursor Sequence

1. Intake
2. Classify mode/category
3. Read AGENTS.md
4. Read constitution
5. Read smallest relevant spec/skill
6. Inspect repository
7. Map owner / SoT / tenant / permissions
8. Resolve real blockers
9. Specify/clarify if necessary
10. Plan
11. Tasks
12. Analyze
13. Select worker/model/tool
14. Implement
15. Parent reviews diff
16. Deterministic checks
17. Real browser E2E
18. Independent verifier
19. False-completion audit
20. Converge
21. Sync spec
22. Final report.

## Context Router

MECHANICAL → target files only.

FEATURE → feature spec + relevant implementation + tests.

DOMAIN → domain spec + SoT contracts + models/services + consumers.

ARCHITECTURE → actual repository structure + architecture contracts + models + integrations.

DEBUGGING → reproduction + logs/errors + affected code + nearby tests.

VISUAL → target UI + selected evidence + relevant components/tokens.

TEST → journey + implementation + E2E infrastructure.

No full repo context without a real reason.

## Repository Inspection

Before technical planning inspect:
git status, versions, scripts, dependencies, schema/migrations, auth, tenant,
permissions, events, notifications, audit, testing, browser infrastructure,
and canonical patterns.

Do not overwrite unknown dirty worktree changes.

## SoT Map

For each domain:
OWNER
STORAGE OWNER
AUTHORITATIVE WRITER
READERS
TENANT
PERMISSIONS
EVENTS
CONSUMERS.

Reject unexplained duplication.

## Blocker Gate

Ask a user question only when the unresolved answer materially changes:
behavior, architecture, security, tenant, permission, cost, external action,
integration, or ownership.

If repository inspection can answer it, inspect instead of asking.

## Spec Kit Workflow

specify / clarify
→ plan
→ tasks
→ analyze
→ implement
→ converge.

Use exact commands exposed by installed Spec Kit integration.
Do not guess command names.
Do not plan while material blockers remain.

## Worker Routing

Cursor Parent
→ coordination, small tasks, classification, context routing, planning,
reviewing worker output, convergence.

Cursor Explore
→ repository discovery, dependency tracing, locating owners, read-only evidence.

OpenCode
→ default implementation engine for backend, APIs, services, DB, normal frontend,
tests, integrations, refactors, normal feature work.

Codex
→ complex implementation, difficult debugging, risky migration, hard/high-fidelity
frontend, focused large changes, focused correction, convergence.

Playwright / Browser Worker
→ real browser E2E, forms, navigation, permissions, actor switching,
refresh/relogin, screenshots, responsive, console, network, regression.

Spec Auditor
→ independent scope/ownership/SoT/permission/spec review.

Verifier
→ independent skeptical completion verification.

## Model Routing

MASTER RULE:
MODEL SELECTION IS TASK-BASED.

Use the lowest-cost / smallest-context route that can reliably complete the task.

Premium usage defaults to zero.

Cursor Parent
→ coordinate first using currently selected model.

OpenCode
→ normal implementation.

Codex
→ difficult implementation.

Composer
→ repetitive/mechanical edits; must not invent architecture.

Fable
→ Product / UX reasoning only when materially needed.

Sol
→ difficult architecture / Source-of-Truth decisions.

Sonnet
→ exceptional difficult frontend only.

Gemini
→ optional visual second opinion; not final product authority.

Opus
→ rare adversarial review.

Grok
→ targeted research/discovery when useful.

Playwright
→ browser/E2E, not a model.

## No Model Fan-Out

Do not send one ordinary problem to multiple expensive models by default.

One task → one primary reasoning/execution path.

A second model requires a distinct reason:
specialization, material independent review, or a genuinely blocked first route.

## Premium Inspection Isolation

PREMIUM MODELS REASON OVER PREPARED EVIDENCE.

PREMIUM MODELS DO NOT PERFORM BROAD EVIDENCE COLLECTION BY DEFAULT.

Preferred:
Explore + deterministic tools + Playwright + targeted repo inspection
→ compact evidence pack
→ premium model only when high-value reasoning is needed.

## Cursor Subagent Model Rule

Custom Cursor agents default to:

model: inherit

Do not permanently pin expensive premium models unless explicitly justified.

## Worker Handoff Contract

Every handoff includes:
OUTCOME
MODE
SPEC / ACCEPTANCE IDs
IN SCOPE
OUT OF SCOPE
ALLOWED FILES
OWNER / SoT
TENANT
PERMISSIONS
REQUIRED TESTS
REQUIRED E2E
PROHIBITED ACTIONS
SECRET / COST BOUNDARIES
EXPECTED RETURN.

Worker return:
FILES CHANGED
TESTS
EVIDENCE
RISKS
UNRESOLVED ITEMS.

Parent must inspect the result.

## Real E2E

ACTION
→ API
→ DATABASE
→ RESPONSE
→ UI
→ REFRESH
→ RELOGIN
→ SAME PERSISTED STATE.

## Multi-Actor E2E

ACTOR A → action
ACTOR B → sees according to permission → acts
ACTOR A → sees final authoritative state.

## Worker Conflict

Before parallel writers inspect git status/diff.

If scopes overlap:
PARALLEL_WORK_CONFLICT.

Choose one owning implementation stream.

## OpenCode Limit Rule

If OpenCode is blocked by rate/usage/auth/model limit,
do not silently move heavy work to Cursor premium models.

Report:
BLOCKED_BY_OPENCODE_LIMIT
COMPLETED
REMAINING
BLOCKER
NEXT STEP.

## Cost / Token Guard

Prefer one precise prompt.
Load only required context.
Stop workers that repeat failures without new evidence.
Do not use paid API billing where an authenticated included route can safely work.

Where telemetry is observable report:
MODEL
PURPOSE
AGENT RUNS
USAGE EVENTS
TOOL ACCESS
FILES SENT
MEDIA SENT
INPUT
CACHE WRITE
CACHE READ
OUTPUT
ON-DEMAND / COST.

If unavailable: NOT_OBSERVABLE.
Never invent numbers.

## False Completion Audit

Before done ask:
Does the real journey work?
Does persistence actually occur?
Does refresh preserve it?
Does re-login preserve it?
Are direct URLs protected?
Are permissions server-side?
Is tenant isolation real?
Do repeated actions behave correctly?
Are failures visible?
Do all required buttons work?
Are mocks/stubs absent from required production paths?
Are spec, plan, tasks, code, tests and UI aligned?

Any "no" is remaining work or a blocker.

## Completion Report

Return:
MODE
STATUS
OUTCOME
SPEC
FILES CHANGED
DATABASE/MIGRATION
TESTS
REAL E2E
ACTORS
TENANT/PERMISSIONS
FAILURE TESTS
CONCURRENCY/IDEMPOTENCY
REGRESSIONS
FALSE-COMPLETION RESULT
EVIDENCE
MODEL/WORKER USAGE
KNOWN LIMITATIONS
BLOCKING DEBT
NEXT STEP.

Never hide PARTIAL behind DONE.
```

---

# 7. CURSOR ALWAYS-ON RULE

Path:

```text
.cursor/rules/orchestrator.mdc
```

Recommended content:

```markdown
---
alwaysApply: true
---

# Cursor Orchestration

- Treat `@AGENTS.md` as the durable repository contract.
- Start each request by identifying one mode:
  `SETUP_ONLY`, `SPEC_ONLY`, `IMPLEMENT`, `BUG`, or `REVIEW`.
- Read the constitution and smallest relevant spec before functional changes.
- Load only the minimum relevant context.
- Inspect actual files, tool versions, scripts, tests, architecture, and dirty
  worktree before changing implementation or tooling.
- Identify the canonical owner / source of truth before adding new state.
- Do not plan or implement while a material blocker changes behavior,
  architecture, security, cost, tenant ownership, permissions, or external actions.
- Use Cursor Explore for noisy repository discovery.
- Use browser/E2E tooling for browser journeys.
- Use `spec-auditor` for independent product/ownership review.
- Use `verifier` before material completion claims.
- Start with zero subagents.
- Use at most two independent subagents.
- Never fan out the same normal task to several agents/models.
- Custom Cursor subagents default to `model: inherit`.
- Premium models receive prepared compact evidence, not broad collection loops.
- Keep the parent accountable for handoffs, diff review, real checks, convergence,
  spec synchronization, and final reporting.
- Never request or expose secrets in chat or repository files.
- Never overwrite unrelated dirty worktree changes.
```

---

# 8. SPEC-FIRST SKILL

Path:

```text
.agents/skills/spec-first/SKILL.md
```

Recommended content:

```markdown
---
name: spec-first
description: Define or change intended product behavior before implementation. Use for new features, scope changes, roles, permissions, workflows, states, integrations, or any request whose intended behavior is not already explicit in the smallest relevant specification.
---

# Spec-First Workflow

1. Read:
   - `AGENTS.md`;
   - `.specify/memory/constitution.md`;
   - smallest relevant artifact under `specs/`.

2. Classify the request:
   - definition;
   - clarification;
   - change;
   - contradiction.

3. Inspect the repository only enough to identify existing owners, integrations,
constraints, and conflicts.

Do not select technical architecture during product specification.

4. Define/update:
- outcome;
- non-goals;
- actors;
- capabilities;
- independently testable journeys;
- acceptance scenarios;
- stable requirement IDs;
- logical owner;
- physical storage owner;
- authoritative writer;
- readers;
- tenant gate;
- permissions;
- events;
- consumers;
- canonical states;
- valid transitions;
- failure states;
- concurrency behavior;
- retries;
- idempotency;
- integration boundaries;
- external sources of truth;
- persistence expectations;
- notifications/deep links when relevant;
- responsive/accessibility/localization expectations when relevant;
- measurable outcomes;
- deferred scope;
- assumptions;
- open decisions.

5. Update only the smallest authoritative specification.

6. Run the applicable requirements checklist.

7. Label an unresolved decision `BLOCKER` only if it materially changes behavior,
architecture, security, cost, external action, or ownership.

8. Stop before technical planning or implementation while affected blockers remain.

Return:
changed spec paths;
requirement IDs;
decisions;
resolved ambiguity;
remaining blockers;
next permitted Spec Kit stage.
```

---

# 9. DELIVER-CHANGE SKILL

Path:

```text
.agents/skills/deliver-change/SKILL.md
```

Recommended content:

```markdown
---
name: deliver-change
description: Implement an approved feature, task, or bounded bug fix using the repository's Spec Kit workflow. Use only when intended behavior is clear and required planning/tasks exist, or when a bounded bug can be fixed without inventing product behavior.
---

# Deliver a Change

1. Read:
AGENTS.md;
constitution;
smallest relevant spec;
approved plan;
selected task IDs.

2. Confirm no material blocker affects the work.
If one exists, stop implementation and return to `spec-first`.

3. Inspect:
git/worktree;
architecture;
canonical owners;
tool versions;
scripts;
existing tests;
nearby canonical examples.

4. Write a bounded implementation contract:
acceptance IDs;
exact in-scope;
exact out-of-scope;
allowed files/domains;
SoT constraints;
tenant constraints;
permission constraints;
state/event constraints;
integrations;
migrations/compatibility;
tests;
E2E;
rollback/recovery for risky changes.

5. Keep small work in the parent.
Delegate one coherent implementation slice only when justified.
Maximum independent subagents: 2.

6. Implement the smallest coherent end-to-end change.
Preserve canonical owners.
Do not create parallel registries, stores, permissions, workflows,
notification systems, audit systems, or external state.

7. Enforce server trust boundaries.
Handle stale, duplicate, concurrency, retry, and partial failure where applicable.

8. Add tests that prove behavior, not merely file presence.

9. Run relevant lint, typecheck, tests, build, and real E2E.

10. Invoke `verify-change`.
Fix/re-run until converged or explicitly blocked.

11. Synchronize the smallest affected specification with durable implemented behavior.

Return:
FILES CHANGED
REQUIREMENTS COMPLETED
CHECKS / RESULTS
E2E EVIDENCE
MIGRATIONS
DECISIONS
RISKS
UNVERIFIED WORK.
```

---

# 10. VERIFY-CHANGE SKILL

Path:

```text
.agents/skills/verify-change/SKILL.md
```

Recommended content:

```markdown
---
name: verify-change
description: Independently verify an implementation or completion claim. Use after implementation, before marking work done, during convergence, or when checking persistence, tenant isolation, permissions, state machines, integrations, notifications, concurrency, or false completion.
---

# Verify a Change

Act as a skeptical independent verifier.

Do not infer success from code presence or another agent's report.

1. Read relevant spec, acceptance IDs, plan, task IDs, and actual diff.

2. Confirm the existing domain owner is preserved and no duplicate source of truth
was introduced.

3. Trace:
Action
→ Request
→ Authorization
→ Durable mutation/integration
→ Response
→ UI
→ Refresh/Re-login
→ Persisted result.

4. Run deterministic repository checks and relevant real E2E.

5. Test applicable negatives:
cross-tenant;
unauthorized role;
invalid state;
stale state;
concurrent transition;
duplicate/retry;
external timeout;
partial external failure;
old/stale deep link;
revoked access.

6. Check:
placeholders;
mocks on required production paths;
orphaned records;
duplicate SoT;
unapproved dependency;
secrets;
spec drift.

7. Compare:
SPEC
PLAN
TASKS
CODE
TESTS
VISIBLE BEHAVIOR.

8. Report by severity.

Each applicable requirement must be:
PASS
FAIL
BLOCKED
NOT TESTED.

Never convert NOT TESTED into PASS.
Default mode is read-only.
Do not edit unless explicitly requested.
```

---

# 11. SPEC AUDITOR AGENT

Path:

```text
.cursor/agents/spec-auditor.md
```

Recommended content:

```markdown
---
name: spec-auditor
description: Independently audit product scope, specification quality, ownership, source-of-truth, permissions, tenant boundaries, lifecycle, and readiness before implementation or during convergence.
model: inherit
readonly: true
---

# Spec Auditor

Act independently and skeptically.
Do not implement code.

Inspect:
constitution;
relevant specs;
requirements;
actual repository ownership where necessary.

Check:
1. Outcome is explicit.
2. Actors are explicit.
3. Permissions are testable.
4. States/transitions are explicit.
5. Failure behavior is defined.
6. Source of truth is identified.
7. No parallel ownership is implied.
8. Tenant boundaries are explicit.
9. Persistence expectations are clear.
10. Integrations identify external owners.
11. Acceptance scenarios prove real behavior.
12. Concurrency/idempotency are covered where required.
13. Deferred scope is explicit.
14. No technical architecture is smuggled into product specification.
15. Material blockers are surfaced.

Return:
PASS
FAIL
BLOCKED
NOT TESTED

with exact evidence.

Do not edit unless explicitly requested.
```

---

# 12. COMPLETION VERIFIER AGENT

Path:

```text
.cursor/agents/verifier.md
```

Recommended content:

```markdown
---
name: verifier
description: Independently validate completed work. Use before material done claims to run real checks, trace end-to-end persistence, test tenant and role boundaries, find false completion, and report passed, failed, blocked, or untested evidence.
model: inherit
readonly: true
---

# Completion Verifier

Be skeptical and independent.
Do not accept the implementer's summary as evidence.
Do not edit files.

1. Read relevant spec, acceptance IDs, plan/tasks, and actual diff.
2. Run applicable lint, typecheck, tests, build, and E2E.
3. Trace:
ACTION
→ REQUEST
→ SERVER AUTHORIZATION
→ DURABLE MUTATION / INTEGRATION
→ RESPONSE
→ UI
→ REFRESH / RELOGIN
→ PERSISTED RESULT.
4. Test tenant isolation, capability denial, stale state, invalid transition,
retry/duplicate, concurrency, external failure, and deep links where relevant.
5. Search for mocks, placeholders, dead buttons, stub APIs, duplicate SoT,
secrets, schema drift, and spec drift.
6. Report each acceptance item:
PASS
FAIL
BLOCKED
NOT TESTED.

State explicitly whether the completion claim is justified.
```

---

# 13. OPENCODE DEFAULT WORKER

Path:

```text
.opencode/agents/project-coder.md
```

Recommended content:

```markdown
# Project Coder

ROLE:
DEFAULT_IMPLEMENTATION_WORKER

Read:
- AGENTS.md
- exact supplied spec/task
- only supplied/relevant files.

Use for:
backend
services
APIs
database implementation
normal frontend
tests
integrations
refactors
routine feature implementation.

Rules:
- preserve existing architecture;
- preserve canonical SoT;
- do not invent product behavior;
- do not modify out-of-scope files;
- enforce tenant/permissions server-side;
- run requested tests;
- report exact changed files;
- do not claim completion without evidence.

Return:
FILES_CHANGED
TEST_RESULTS
RISKS
UNRESOLVED_ITEMS.
```

OpenCode is the **default implementation engine** for normal bounded work.

If OpenCode is blocked by usage/rate/auth/model limits, do not silently move the same heavy task to Cursor premium models.

Report:

```text
BLOCKED_BY_OPENCODE_LIMIT

COMPLETED:
...

REMAINING:
...

CURRENT BLOCKER:
...

NEXT STEP:
...

CURSOR FALLBACK NOT USED
```

---

# 14. BROWSER WORKER

Optional path:

```text
.opencode/agents/browser-worker.md
```

Recommended content:

```markdown
# Browser Worker

ROLE:
BROWSER_EVIDENCE_COLLECTOR

Use deterministic browser automation where possible.

Collect:
URL/state
actor
viewport
navigation
interaction
screenshot when useful
console errors
network errors
refresh/relogin result
permissions
persisted journey result.

Do not treat screenshots alone as persistence evidence.
Do not persist authentication cookies/tokens into repository evidence.
Keep evidence compact.
Do not act as final completion authority.
```

---

# 15. CODEX HANDOFF

Path:

```text
docs/CODEX_HANDOFF.md
```

Recommended content:

```markdown
# Codex Handoff Contract

Codex is the high-capability coding worker.

Use only for justified difficult work.

Every Codex handoff must contain:

OUTCOME
MODE
SPEC IDS
ACCEPTANCE IDS
ALLOWED FILES
IN SCOPE
OUT OF SCOPE
OWNER / SoT
TENANT
PERMISSIONS
MIGRATION RULES
REQUIRED TESTS
REQUIRED E2E
PREPARED EVIDENCE
EXPECTED RETURN.

Do not send the full repository by default.

Codex must return:

FILES_CHANGED
IMPLEMENTATION_SUMMARY
TESTS
MIGRATIONS
RISKS
UNRESOLVED_ITEMS.

The Cursor parent remains responsible for final verification.
```

Use Codex for:
complex implementation, difficult debugging, risky migration,
architecture-heavy implementation, hard/high-fidelity frontend,
focused large changes, focused corrections, and convergence.

If Codex CLI is already authenticated through ChatGPT, prefer the existing authenticated path over unnecessary API billing.

---

# 16. PLAYWRIGHT

Playwright is the browser / E2E / observation engine.

Playwright is **not an AI model**.

Use it for:

```text
navigation
clicking
forms
multi-actor journeys
permissions
refresh
relogin
screenshots
responsive checks
console errors
network errors
deep links
Back/Forward
regression
browser state verification
```

Permanent real E2E rule:

```text
ACTION
→ API
→ DATABASE
→ RESPONSE
→ UI
→ REFRESH
→ RELOGIN
→ SAME PERSISTED STATE
```

For multi-actor features:

```text
ACTOR A
→ ACTION
→ PERSIST

ACTOR B
→ LOGIN
→ SEE ACCORDING TO PERMISSION
→ ACT

ACTOR A
→ SEE AUTHORITATIVE FINAL RESULT
```

Do not let an expensive reasoning model manually perform every browser click when deterministic Playwright scripts/locators can collect the same evidence.

Screenshots alone do not prove persistence.

Do not commit cookies, auth tokens, storage state, or secrets into repository evidence.

---

# 17. SPEC KIT INITIALIZATION

Before initializing anything, inspect the installed toolchain.

Typical read-only preflight:

```bash
git --version
gh --version
gh auth status
specify --version
specify integration list
cursor-agent --version
opencode --version
codex --version
node --version
npm --version
npx --no-install playwright --version
```

Rules:

- Do not reinstall a working tool.
- Do not guess CLI syntax.
- If `specify` syntax differs, inspect:

```bash
specify init --help
specify integration list
```

- Initialize Spec Kit only once.
- Preserve managed files.

Typical form when confirmed by installed CLI:

```bash
specify init --here --force --non-interactive --integration cursor-agent
```

Do not run Spec Kit initialization twice unnecessarily.

---

# 18. SPEC KIT FEATURE LIFECYCLE

For a new feature:

```text
SPECIFY / CLARIFY
        ↓
PLAN
        ↓
TASKS
        ↓
ANALYZE
        ↓
IMPLEMENT
        ↓
CONVERGE
```

Use the exact command/skill names exposed by the installed Spec Kit integration.

Do not guess whether the command is `/speckit-plan` or something else.

---

# 19. SPEC.MD CONTENT CONTRACT

`spec.md` defines WHAT and WHY.

Include when relevant:

```text
FEATURE OUTCOME
WHY
ACTORS
CAPABILITIES
USER JOURNEYS
ACCEPTANCE SCENARIOS
FUNCTIONAL REQUIREMENTS WITH IDS
NON-GOALS
DOMAIN OWNER
STORAGE OWNER
AUTHORITATIVE WRITER
READERS
TENANT
PERMISSIONS
STATES
TRANSITIONS
FAILURES
RETRY
IDEMPOTENCY
CONCURRENCY
INTEGRATION BOUNDARIES
NOTIFICATIONS
DEEP LINKS
PERSISTENCE EXPECTATIONS
ACCESSIBILITY / I18N WHEN RELEVANT
DEFERRED SCOPE
OPEN DECISIONS
SUCCESS MEASURES
```

Do not use it as a substitute for `plan.md`.

---

# 20. PLAN.MD CONTENT CONTRACT

`plan.md` defines HOW.

```text
REPOSITORY FINDINGS
STACK / ARCHITECTURE DECISIONS
AFFECTED MODULES
SOURCE-OF-TRUTH IMPACT
CONTRACTS
DATABASE / MIGRATION
API
AUTH
TENANT
PERMISSIONS
EVENTS
INTEGRATIONS
TEST STRATEGY
E2E STRATEGY
ROLLBACK / RISK
CONSTITUTION CHECK
```

No plan while material blocker decisions remain unresolved.

---

# 21. TASKS.MD CONTENT CONTRACT

Tasks must be:

```text
DEPENDENCY ORDERED
BOUNDED
INDEPENDENTLY VERIFIABLE
MAPPED TO REQUIREMENTS
MAPPED TO ACCEPTANCE IDS
```

Every task should state:

```text
TASK ID
LINKED REQUIREMENT IDS
LINKED ACCEPTANCE IDS
EXACT SCOPE
FILES / MODULES
DEPENDENCIES
VERIFICATION
```

Testing, migration, E2E, and spec sync are part of delivery.

---

# 22. RESEARCH.MD

Create only when real research is needed.

```text
QUESTION
OPTIONS
EVIDENCE
DECISION
RATIONALE
REJECTED OPTIONS
RISKS
```

---

# 23. DATA-MODEL.MD

Create when needed.

```text
ENTITIES
OWNERSHIP
RELATIONSHIPS
STATE
CONSTRAINTS
TENANT
INDEX / UNIQUENESS NEEDS
LIFECYCLE
```

Do not merely duplicate ORM schema line-by-line.

---

# 24. CONTRACTS/

Use for:

```text
API CONTRACTS
EVENT CONTRACTS
INTEGRATION CONTRACTS
PORTS / ADAPTERS
EXTERNAL PROVIDER BOUNDARIES
WEBHOOK CONTRACTS
```

---

# 25. QUICKSTART.MD

Recommended:

```text
PREREQUISITES
RUN COMMANDS
SEED / FIXTURE
USER JOURNEY
EXPECTED RESULT
VERIFICATION COMMANDS
KNOWN LIMITATIONS
```

---

# 26. REQUIREMENTS CHECKLIST

Path:

```text
checklists/requirements.md
```

Recommended:

```markdown
# Requirements Quality Checklist

- [ ] Outcome is explicit.
- [ ] Actors are explicit.
- [ ] Requirements are independently testable.
- [ ] Non-goals are explicit.
- [ ] Lifecycle/states are explicit where relevant.
- [ ] Ownership / SoT is explicit.
- [ ] Permissions are explicit.
- [ ] Tenant boundary is explicit.
- [ ] Persistence expectations are explicit.
- [ ] Failure states are explicit.
- [ ] Retry/idempotency/concurrency are covered where relevant.
- [ ] Integrations identify authoritative external owners.
- [ ] Notifications/deep links are defined where relevant.
- [ ] E2E acceptance journey is defined.
- [ ] Material blockers are explicit.
```

---

# 27. TASK CLASSIFICATION

Every request gets one Mode and one primary Category.

Modes:

```text
SETUP_ONLY
SPEC_ONLY
IMPLEMENT
BUG
REVIEW
```

Categories:

```text
MECHANICAL
FEATURE
DOMAIN
ARCHITECTURE
DEBUGGING
RESEARCH
VISUAL
TEST / REGRESSION
```

Do not silently change modes.

`SPEC_ONLY` must not suddenly modify production code.

---

# 28. CONTEXT ROUTER

Permanent rule: do not load the full repository and all specs for every task.

```text
MECHANICAL
→ target files only

FEATURE
→ feature spec
+ relevant code
+ tests

DOMAIN
→ domain spec
+ SoT contracts
+ affected models/services
+ consumers

ARCHITECTURE
→ architecture contracts
+ actual repo structure
+ relevant models
+ integrations

DEBUGGING
→ reproduction
+ error evidence
+ affected code
+ nearby tests

VISUAL
→ target UI
+ selected evidence
+ relevant tokens/components

TEST
→ journey
+ implementation
+ E2E infrastructure
```

No full repo context without a real reason.

---

# 29. SOURCE-OF-TRUTH MAP

Before meaningful domain changes identify:

```text
LOGICAL OWNER
PHYSICAL STORAGE OWNER
AUTHORITATIVE WRITER
PERMITTED READERS
TENANT BOUNDARY
PERMISSION / CAPABILITY GATE
EVENTS
DOWNSTREAM CONSUMERS
```

Permanent rule:

```text
ONE FACT
→ ONE AUTHORITATIVE SOURCE OF TRUTH
```

Cross-module visibility does not transfer ownership.

---

# 30. BLOCKER GATE

Before plan or implementation ask:

Would this unresolved decision materially change:

```text
behavior
architecture
security
tenant
permissions
database
external cost
external action
integration
ownership
```

If yes:

```text
BLOCK
```

Resolve it first.

If repository inspection can answer the issue, inspect instead of asking.

---

# 31. WORKER ROUTING SUMMARY

```text
SMALL / OBVIOUS TASK
→ Cursor Parent

NORMAL BOUNDED IMPLEMENTATION
→ OpenCode

HARD CODING / DEBUGGING / RISKY MIGRATION / HIGH-FIDELITY IMPLEMENTATION
→ Codex

MECHANICAL
→ Composer

REPOSITORY DISCOVERY
→ Cursor Explore

BROWSER / E2E
→ Playwright / Browser Worker

PRODUCT / UX SPECIALIST REASONING
→ Fable only when needed

ARCHITECTURE / DIFFICULT SoT
→ Sol only when needed

EXCEPTIONAL DIFFICULT FRONTEND
→ Sonnet

VISUAL SECOND OPINION
→ Gemini

RARE ADVERSARIAL REVIEW
→ Opus

TARGETED RESEARCH
→ Grok
```

---

# 32. MODEL ROUTING MASTER RULE

Model selection is task-based, not habit-based.

Use the lowest-cost / smallest-context route that can reliably solve the task.

Default premium usage:

```text
Fable = 0
Sol = 0
Sonnet = 0
Gemini = 0
Opus = 0
```

Do not call a premium model merely because it is available.

---

# 33. NO MODEL FAN-OUT

Forbidden default:

```text
Fable + Sol + Sonnet + Gemini + Opus
```

all reviewing one normal change.

Default:

```text
ONE TASK
→ ONE PRIMARY EXECUTION / REASONING PATH
```

A second model requires a distinct reason:
specialization, material independent review, or a genuinely blocked first route.

---

# 34. PREMIUM INSPECTION ISOLATION

Permanent rule:

```text
PREMIUM MODELS REASON OVER PREPARED EVIDENCE.

PREMIUM MODELS DO NOT PERFORM BROAD EVIDENCE COLLECTION BY DEFAULT.
```

Preferred:

```text
Explore
+ local deterministic tools
+ Playwright
+ targeted repo inspection
        ↓
COMPACT EVIDENCE PACK
        ↓
premium model only if high-value reasoning is required
```

---

# 35. CURSOR CUSTOM SUBAGENT MODEL RULE

Default for custom Cursor agents:

```text
model: inherit
```

Do not permanently hard-pin expensive premium models to routine agents.

---

# 36. MODEL USAGE / COST GUARD

Prefer one precise prompt over many broad prompts.

Stop a worker if it:
- expands scope;
- repeats failed attempts;
- repeatedly collects context without new value;
- repeatedly invokes models without new evidence.

Do not reinstall already-working tools.

Do not use paid API billing when an already-authenticated included route can safely do the same job.

Where telemetry exists report:

```text
MODEL
PURPOSE
AGENT RUNS
USAGE EVENTS
TOOL ACCESS
FILES SENT
MEDIA SENT
INPUT TOKENS
CACHE WRITE
CACHE READ
OUTPUT TOKENS
ON-DEMAND / COST
```

If unavailable:

```text
NOT_OBSERVABLE
```

Never invent usage numbers.

---

# 37. TOOL-FIRST EVIDENCE RULE

Do not spend reasoning-model tokens collecting deterministic facts.

```text
repository paths → Explore/search
browser state → Playwright
database state → query/test
lint/type errors → compiler/tooling
network errors → browser/network logs
geometry → browser/devtools measurements
```

Use reasoning models for interpretation and decisions.

---

# 38. WORKER HANDOFF CONTRACT

Every worker gets:

```text
OUTCOME
MODE
EXACT SPEC / REQUIREMENT IDs
IN-SCOPE
OUT-OF-SCOPE
ALLOWED FILES / DIRECTORIES
SOURCE-OF-TRUTH RULES
TENANT RULES
PERMISSION RULES
REQUIRED TESTS
REQUIRED E2E
PROHIBITED ACTIONS
SECRET / EXTERNAL COST BOUNDARIES
EXPECTED RETURN FORMAT
```

Worker return:

```text
FILES CHANGED
TEST RESULTS
EVIDENCE
RISKS
UNRESOLVED ITEMS
```

Parent must inspect the diff and verify.

---

# 39. PARALLEL WORK CONFLICT RULE

Before multiple writers:

```text
git status
git diff
```

If write scopes overlap:

```text
PARALLEL_WORK_CONFLICT
```

Return:

```text
FILE / DOMAIN
TASK REQUIREMENT
CURRENT CONCURRENT CHANGE
SAFEST INTEGRATION PATH
```

Do not create duplicate temporary architecture to avoid a conflict.
Never overwrite unrelated work.

---

# 40. IMPLEMENTATION RULE

Preserve existing correct architecture.

Mental model:

```text
KEEP
POLISH
REARRANGE
COMPLETE
CONNECT
ADD
IGNORE
```

Prefer:
- KEEP existing correct implementation;
- COMPLETE incomplete behavior;
- CONNECT canonical owners;
- ADD only genuinely missing capability.

---

# 41. DATABASE RULE

Permanent persistence must use the project's canonical schema/migration mechanism.

Do not allow:

```text
runtime-only permanent DDL
hidden permanent tables
frontend persistence pretending to be DB persistence
temporary JSON becoming permanent source of truth
```

No destructive reset unless explicitly authorized.

---

# 42. SERVER-AUTHORITATIVE SECURITY

Every protected action must enforce server-side:

```text
AUTHENTICATION
+
TENANT
+
PERMISSION / CAPABILITY
+
RECORD SCOPE
+
ACTION VALIDITY
```

UI hiding is not security.
Client-provided tenant/company/user IDs do not grant authority.

---

# 43. COMPLETE-JOURNEY RULE

Prefer one complete journey over many shallow features.

```text
CONFIGURE
→ USER ACTION
→ VALIDATION
→ API
→ DATABASE
→ DOMAIN STATE
→ RESPONSE
→ UI
→ OTHER ACTOR
→ NOTIFICATION
→ AUDIT
→ REFRESH
→ RELOGIN
```

Then move to the next journey.

---

# 44. FAILURE / SAFETY MATRIX

Execute relevant tests for:

```text
VALIDATION
PERMISSION DENIAL
CROSS-TENANT DENIAL
NOT FOUND
NETWORK / API FAILURE
DUPLICATE SUBMISSION
RETRY
IDEMPOTENCY
CONCURRENT UPDATE
STALE WRITE
CONFLICT
PARTIAL FAILURE
LOADING
EMPTY
ERROR
```

High-value concurrency scenarios must actually run.

---

# 45. FALSE-COMPLETION AUDIT

Before completion:

```text
NO blocking TODO
NO blocking FIXME
NO mocks pretending to be real
NO fake persisted data
NO unwired buttons
NO dead menus
NO stub APIs
NO fake success
NO client-only security
NO client-only persistence
NO hidden runtime schema
NO unhandled required errors
NO required API-only capability when product requires UI
NO duplicate SoT
NO unverified worker completion
```

Also verify:
DB changes, refresh, relogin, permissions, tenant isolation, failure states,
loading/empty/error, and direct URLs when relevant.

---

# 46. INDEPENDENT VERIFICATION

The implementer does not self-certify solely from its own summary.

For material work, use an independent verifier.

Default:

```text
READ-ONLY
SKEPTICAL
EVIDENCE-BASED
```

Check:
requirements, architecture, diff, tests, E2E, tenant, permissions,
false completion, regressions, and unapproved scope.

---

# 47. CONVERGENCE

Compare:

```text
SPEC
PLAN
TASKS
CODE
DATABASE
API
UI
TESTS
E2E
INTEGRATIONS
DOCUMENTATION
```

All must describe the same product behavior.

Any meaningful mismatch = remaining work.

---

# 48. DELIVERY GATES

## Gate A — Definition Ready

Outcome clear, actors clear, scenarios clear, requirements testable,
non-goals explicit, material ambiguity resolved.

## Gate B — Architecture Ready

Repository inspected, SoT explicit, tenant/permissions explicit,
data/migration explicit, integration/failure strategy explicit.

## Gate C — Tasks Ready

Tasks bounded, dependency ordered, acceptance mapped, tests/E2E included.

## Gate D — Implementation Ready for Review

Deterministic checks pass, no unapproved architecture, no unrelated edits,
no secrets, no fake placeholders, real journey evidence exists.

## Gate E — Converged

Spec, plan, tasks, code, tests, UI, and integrations agree.
False-completion audit passes.
Remaining limitations explicit.

---

# 49. GIT SAFETY

Do not force-push, `reset --hard`, delete unrelated work, or overwrite unknown dirty files unless explicitly authorized.

Do not automatically commit or push unless the project/user workflow authorizes it.

Review diffs semantically.

---

# 50. EXTERNAL ACTION SAFETY

Actions involving money, production publishing, external spend, destructive data,
credentials, customer communication, or provider mutations require the authorization
defined by the project.

Never ask users to paste passwords/tokens/API keys into chat or repository files.

---

# 51. README ENTRY POINT

Recommended development section:

```markdown
# Development Operating System

This repository uses:

- Cursor as orchestrator
- Spec Kit as product/spec workflow
- OpenCode as default implementation engine
- Codex for high-capability coding when justified
- Playwright for browser/E2E
- independent Spec Auditor
- independent Verifier

Read:

1. `AGENTS.md`
2. `.specify/memory/constitution.md`
3. `docs/CURSOR_WORKFLOW.md`

before meaningful development.

## Tool Preflight

Before installing anything inspect:

git --version
gh --version
gh auth status
specify --version
specify integration list
cursor-agent --version
opencode --version
codex --version
node --version
<project package manager> --version
npx --no-install playwright --version

Do not reinstall a working tool.
Do not guess Spec Kit syntax.

If needed inspect:

specify init --help
specify integration list

## Feature Workflow

SPECIFY
→ PLAN
→ TASKS
→ ANALYZE
→ IMPLEMENT
→ VERIFY
→ CONVERGE.

## Completion

Never accept "done" without:
tests
real E2E
false-completion audit
spec sync.
```

---

# 52. GITIGNORE RECOMMENDATIONS

```gitignore
# Secrets
.env
.env.*
!.env.example

# Local evidence
.visual-reference/*
!.visual-reference/.gitkeep

# Browser/session artifacts
playwright-report/
test-results/
.auth/
storage-state*.json

# Tool temporary artifacts
.tmp/
.cache/

# OS
.DS_Store
```

Never commit cookies, auth tokens, browser storage state, API keys, or other secrets.

---

# 53. FULL CURSOR OPERATING FLOW

```text
                      USER
                        │
                        ▼
                 CURSOR PARENT
                        │
              reads orchestrator.mdc
                        │
                        ▼
                    AGENTS.md
                        │
             + constitution.md
                        │
                        ▼
                 TASK CLASSIFIER
                        │
                        ▼
                  CONTEXT ROUTER
                        │
        ┌───────────────┼───────────────┐
        ▼               ▼               ▼
   smallest Spec    Repo Explore     needed Skill
        │               │               │
        └───────────────┬───────────────┘
                        ▼
                OWNER / SoT MAP
                        │
                        ▼
                  BLOCKER GATE
                        │
                        ▼
                    SPEC KIT
                        │
          SPECIFY → PLAN → TASKS
                        │
                     ANALYZE
                        │
                        ▼
                   ROUTE WORK
                        │
       ┌────────────────┼─────────────────┐
       ▼                ▼                 ▼
    OpenCode          Codex            Composer
  normal coding    hard coding       mechanical
       │                │                 │
       └────────────────┼─────────────────┘
                        ▼
                  IMPLEMENTATION
                        │
                        ▼
              deterministic checks
                        │
                        ▼
                   PLAYWRIGHT
                 REAL BROWSER E2E
                        │
                        ▼
                   VERIFIER
                        │
                        ▼
              FALSE COMPLETION
                        │
                        ▼
                   CONVERGE
                        │
        SPEC ↔ PLAN ↔ TASKS ↔ CODE
             ↔ TEST ↔ UI ↔ DB
                        │
                        ▼
                    SPEC SYNC
                        │
                        ▼
                 FINAL REPORT
```

---

# 54. MODEL ROUTER OVERLAY

```text
NORMAL IMPLEMENTATION
→ OpenCode

HARD IMPLEMENTATION / DEBUG
→ Codex

MECHANICAL
→ Composer

PRODUCT / UX
→ Fable only when needed

ARCHITECTURE / SoT
→ Sol only when needed

EXCEPTIONAL FRONTEND
→ Sonnet

VISUAL SECOND OPINION
→ Gemini

RARE ADVERSARIAL REVIEW
→ Opus

TARGETED RESEARCH
→ Grok

BROWSER / E2E
→ Playwright / Browser Worker

CUSTOM CURSOR SUBAGENTS
→ model: inherit
```

Permanent rules:

```text
DEFAULT PREMIUM MODELS = 0
NO MODEL FAN-OUT
PREMIUM MODELS REASON OVER PREPARED EVIDENCE
DETERMINISTIC TOOLS COLLECT EVIDENCE FIRST
```

---

# 55. MATERIAL TASK COMPLETION REPORT

Every meaningful completion report should contain:

```text
MODE
OUTCOME
STATUS
SPEC / REQUIREMENTS
ARCHITECTURE / SoT IMPACT
FILES CHANGED
DATABASE / MIGRATION
TESTS
REAL E2E
ACTORS TESTED
TENANT / PERMISSION RESULTS
FAILURE TESTS
CONCURRENCY / IDEMPOTENCY
REGRESSIONS
FALSE-COMPLETION RESULT
EVIDENCE PATH
MODEL / WORKER USAGE
KNOWN LIMITATIONS
BLOCKING DEBT
NEXT STEP
```

Never hide PARTIAL behind DONE.

---

# 56. FINAL COMPLETION RULE

A project slice may be called complete only when:

```text
DEFINITION READY
+
ARCHITECTURE READY
+
TASKS READY
+
IMPLEMENTATION PASS
+
REAL E2E PASS
+
PERMISSION / TENANT PASS
+
FAILURE PASS
+
FALSE COMPLETION PASS
+
INDEPENDENT REVIEW PASS when material
+
SPEC / CODE / TEST / UI CONVERGED
```

Otherwise report PARTIAL or BLOCKED with exact remaining work.

---

# 57. GOLDEN RULES

```text
BUILD LESS AT ONCE.
LOAD LESS CONTEXT.
USE FEWER AGENTS.
USE FEWER PREMIUM MODELS.
COLLECT EVIDENCE DETERMINISTICALLY.
KEEP ONE SOURCE OF TRUTH.
COMPLETE ONE REAL JOURNEY AT A TIME.
VERIFY BEFORE CLAIMING DONE.
SYNC PRODUCT TRUTH AFTER IMPLEMENTATION.
```

---

# 58. NEW REPOSITORY BOOTSTRAP SEQUENCE

## Phase 1 — Read-only preflight

Inspect without installing:

```bash
git --version
gh --version
gh auth status
specify --version
specify integration list
cursor-agent --version
opencode --version
codex --version
node --version
npm --version
npx --no-install playwright --version
```

Also inspect:
current working directory, target project directory, existing local folder,
authenticated GitHub account, and target remote availability.

Rules:
- Never guess the GitHub owner.
- Never reuse/overwrite an existing repo or folder silently.
- Network/permission ambiguity is BLOCKED, not proof that a repo is free.
- If authentication is missing, ask for manual login.
- Do not accept credentials in chat.
- If a tool is missing, report it before installation.
- Never reinstall a working tool.

## Phase 2 — Initialize local repository

After preflight is READY:

```bash
git init -b main
```

if needed.

## Phase 3 — Initialize official Spec Kit Cursor integration

Inspect CLI help first when needed.

Typical command only when confirmed by installed version:

```bash
specify init --here --force --non-interactive --integration cursor-agent
```

Do this once.
Preserve generated Spec Kit files.

## Phase 4 — Add the generic workflow overlay

Add:

```text
AGENTS.md
README.md
docs/CURSOR_WORKFLOW.md
docs/CODEX_HANDOFF.md
.specify/memory/constitution.md
.agents/skills/spec-first/SKILL.md
.agents/skills/deliver-change/SKILL.md
.agents/skills/verify-change/SKILL.md
.cursor/rules/orchestrator.mdc
.cursor/agents/spec-auditor.md
.cursor/agents/verifier.md
.opencode/agents/project-coder.md
.opencode/agents/browser-worker.md
.visual-reference/.gitkeep
```

Do not create product code during pure setup.

## Phase 5 — Verify tooling and workflow

Verify:

```text
Spec Kit recognized
Cursor rules recognized
Cursor custom agents recognized
OpenCode available/authenticated if used
Codex available/authenticated if used
Playwright/browser infrastructure available
Git status clean or understood
```

## Phase 6 — Begin first real feature

Only then:

```text
SPECIFY / CLARIFY
→ PLAN
→ TASKS
→ ANALYZE
→ IMPLEMENT
→ VERIFY
→ CONVERGE
```

---

# 59. READY-TO-USE CURSOR MASTER INSTRUCTION

When this file is placed in a repository or sent to Cursor, use this instruction:

```text
Treat this document as the master development operating system for this repository.

Your role is Cursor Orchestrator.

Do not immediately code.

For every request:

1. classify MODE;
2. classify TASK CATEGORY;
3. read AGENTS.md;
4. read the constitution;
5. load only the smallest relevant spec/skill;
6. inspect the actual repository and dirty worktree;
7. identify owner / SoT / tenant / permission boundaries;
8. resolve only material blockers;
9. use Spec Kit for new or changed intended behavior;
10. produce plan/tasks only after blockers are resolved;
11. route implementation to the lowest-cost suitable worker;
12. use OpenCode for normal implementation;
13. use Codex only for justified difficult coding/debugging/high-fidelity work;
14. use Playwright/browser tooling for real E2E and browser evidence;
15. use premium models only when their specialty is materially needed;
16. premium models must reason over prepared evidence, not broadly collect it;
17. never fan out several premium models over one ordinary task;
18. protect unrelated dirty worktree changes;
19. enforce one source of truth;
20. enforce server-side tenant/permission boundaries;
21. run deterministic checks;
22. prove persistent behavior through refresh/relogin;
23. run multi-actor E2E when applicable;
24. invoke independent verification before material done claims;
25. run false-completion audit;
26. converge spec/plan/tasks/code/tests/UI/integrations;
27. sync the smallest affected spec;
28. report COMPLETE, PARTIAL, or BLOCKED with evidence.

Never treat another worker's "done" statement as proof.
Never invent token/cost telemetry.
Never install/reconfigure a working tool without need.
Never request secrets in chat.
Never perform destructive or spend-bearing external actions without the required authorization.
```

---

# END OF MASTER FILE
