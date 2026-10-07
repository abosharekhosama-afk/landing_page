# Cursor → OpenCode workers

Cursor orchestrates. OpenCode workers execute delegated tasks only.

Project orchestration standard: `docs/CURSOR_DEVELOPMENT_OPERATING_SYSTEM.md` (consult when needed; do not paste into every prompt). Always-on Cursor rule: `.cursor/rules/project-workflow.mdc`.

Guidance: `.specify/memory/constitution.md` (via `opencode.json` `instructions`). Do not duplicate it here.

## Commands

Always pass `--dir` set to this repository’s absolute root (the directory containing `opencode.json` and `.opencode/`). Do not rely on shell cwd alone.

Browser / site inspection:

```text
opencode run --agent browser-worker --auto --print-logs --log-level INFO --dir "<repo-root>" -- "<task>"
```

Narrow coding task (normal implementation):

```text
opencode run --agent imkan-coder --auto --print-logs --log-level INFO --dir "<repo-root>" -- "<task>"
```

If OpenCode is unavailable for normal implementation, Cursor reports `BLOCKED` / `BLOCKED_BY_OPENCODE_LIMIT` and does not silently implement or fall back to premium models.

## Workflow

1. User asks Cursor for work.
2. Cursor gathers the relevant spec and acceptance criteria (`specs/<feature>/spec.md`, `plan.md`, `tasks.md`, contracts) when they exist.
3. Cursor delegates to the matching OpenCode worker with an explicit scope.
4. Worker returns evidence (browser-worker) or changed files, `git diff` / `git status`, and focused test results (imkan-coder).
5. Cursor reviews the worker output.
6. If corrections are needed, Cursor sends a follow-up worker task.
7. User approval is required before any commit or push. Workers never commit or push.

## Defaults

- browser-worker: Staging / read-only; Chrome DevTools MCP; never edits the repo.
- imkan-coder: scoped local file changes only; never git add/commit/push/reset/stash/restore/clean; never create or switch branches.
- Production, CPanel/Vercel/database writes, and migrations require an explicit current authorization in the prompt.
- Spec Kit may create/read spec, plan, and tasks; normal code implementation still routes to `imkan-coder` (routing is not encoded in Spec Kit skills).
