# Core Agent Rules

- Before coding, resolve ambiguity that affects correctness. If clarification is blocking, ask; otherwise state assumptions and proceed.
- Prefer the smallest sufficient solution; do not add speculative features, abstractions, dependencies, or configurability.
- Make surgical changes: edit only what the task requires; do not refactor, rename, reformat, or clean unrelated code.
- Follow existing code style, structure, naming, and conventions unless the task explicitly requires changing them.
- Work from verifiable goals: for non-trivial changes, define expected behavior before implementation and run the smallest relevant check afterward.
- For bugs, reproduce the failure when feasible; otherwise explain why reproduction is not possible, fix the minimal cause, and verify the failure no longer occurs.
- For features, preserve existing behavior unless explicitly asked otherwise, and verify the requested behavior works.
- Do not claim success unless verification was actually performed; if not verified, state exactly what was not checked.

## Code Reading Rules

- These rules take effect during code quality audits and redefine code reading into two modes: broad reading and close reading.
- Broad reading: when starting a new session or before executing a task, quickly read through the project to understand the overall functionality. Do not deeply inspect details unless needed.
- Close reading: when carefully auditing code or fixing bugs, read the relevant code closely. Read only one file at a time. If a single file is too long, continue in chunks and read only one fragment at a time. After each read, immediately output a brief analysis report, then immediately read the next code file.
- Task quality review: after every modification task is completed, still perform a Review quality review step. During task quality review, follow the close reading rules. During the review, ignore prior context and memory, and rely on the actual current environment.

## Goal Mode

- When in goal mode, or when the user's prompt contains `/goal`, you must enter this workflow.
- In the current project involved in the work, create a new directory with an incrementing number and do not overwrite existing directories:

```text
goal-[num]/
  input.md
  plan.md
  tasks.md
```

- If there is currently no project, create one.
- `input.md` must preserve the user's original input completely and verbatim. Do not rewrite it.
- `plan.md` must analyze the requirement, context, risks, execution approach, verification method, and rollback plan.
- `tasks.md` must split the plan into small tasks. Every task must be independently verifiable. Leave space in `tasks.md` for recording what was done when tasks are completed.
- After every three tasks, perform one large, comprehensive check-debug loop to ensure there are no bugs or issues.
- Do not modify code before `input.md`, `plan.md`, and `tasks.md` are complete.
- Execute only one task at a time.
- Each time you want to finish a task, think: "Are you 100% confident in the current implementation?" If not, identify all possible gaps and improvements, propose suitable fixes, and repeat this loop until you are factually 100% confident in the new implementation.
- Then commit the code if there are code changes.
- Mark the task complete in `tasks.md` and record what you did.
- Briefly report to the user, then stop output. The next task starts in the next round.
- After every context compaction, fully read `input.md`, `plan.md`, and `tasks.md` to avoid ambiguous context.
- After all tasks are complete, perform the largest final review: analyze the project comprehensively from client-side/user-facing behavior, code, security, and other relevant angles. Repair and test until complete, then mark the goal complete.

## Agent skills

### Issue tracker

Issues and PRDs are tracked as local markdown files under `.scratch/`. See `docs/agents/issue-tracker.md`.

### Triage labels

Use the default mattpocock/skills triage label vocabulary. See `docs/agents/triage-labels.md`.

### Domain docs

Use the single-context domain docs layout: root `CONTEXT.md` and `docs/adr/`. See `docs/agents/domain.md`.
