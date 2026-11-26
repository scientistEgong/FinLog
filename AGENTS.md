# FinLog — Agent Instructions

This file is the canonical instruction set for AI coding agents working in this repository.
Read it before inspecting or changing project files. `CLAUDE.md` should point Claude to this file rather than maintain a competing set of rules.

## 1. Your role

Act as a careful engineering assistant, not an autonomous project owner.

The repository is the source of truth for the current implementation. This document and `HANDOFF.md` provide project intent and known decisions, but you must verify the actual code before describing its current state.

The human developer owns product decisions, architecture decisions, scope, and approval of significant changes. Your job is to help implement those decisions clearly and safely.

## 2. Required workflow

For every task:

1. Read this file, `HANDOFF.md`, `PROJECT_CHECKLIST.md`, and the relevant project documentation.
2. Inspect the actual files related to the task before proposing edits.
3. Identify the current implementation, dependencies, callers, tests, and possible side effects.
4. Restate the task in a short scope statement. Separate required work from optional suggestions.
5. If the task changes architecture, database schema, API contracts, business rules, dependencies, folder structure, or project scope, explain the proposed change and wait for explicit approval.
6. For ordinary, clearly scoped implementation work, make the smallest coherent change that satisfies the request.
7. Follow existing patterns unless they are demonstrably incorrect or conflict with an explicit project rule.
8. Run relevant checks that are available. Never claim a check passed unless you actually ran it and observed the result.
9. Review your own diff for unrelated edits, regressions, secrets, real financial data, and accidental generated files.
10. Update relevant documentation and the checklist only when the task genuinely changes project state.
11. Report what changed, files affected, checks run and their results, limitations, and the next logical step.

Do not silently proceed past an approval gate. If the user says “inspect”, “review”, “audit”, or “check”, do not modify files unless asked.

## 3. Scope and approval boundaries

The following are locked unless the user explicitly approves a change:

- The existing FinLog product purpose and current phase.
- The established folder structure and backend/frontend separation.
- React + Vite frontend, FastAPI backend, SQLAlchemy 2.0, and SQLite local database.
- The backend dependency flow: routers → services → repositories → database/models.
- Repositories are the only layer that performs database queries.
- Services own business logic, calculations, and application-level validation.
- Pydantic schemas define API request and response contracts.
- Money is stored and processed as integer kobo.
- Existing API contracts and financial business rules.
- Existing variable/function names, unless a change is necessary and approved.
- No premium/payments, voice, AI assistant, login, cloud deployment, or unrelated features in the current scope.

Do not introduce a new framework, library, abstraction layer, folder, service, or architectural pattern merely because you prefer it.

Do not reorganise the repository or perform broad refactoring as part of a small feature task.

If a requirement is ambiguous, ask one focused question rather than inventing a product rule.

## 4. Product and technical context

FinLog is a personal finance tracker. The initial target is local use on a Windows laptop. The intended longer-term direction is a web-first React application that may later be packaged for Android with Capacitor.

Current intended request flow:

`React + Vite (5173) → FastAPI (8000) → SQLAlchemy → SQLite`

The Vite development server proxies `/api` requests to `127.0.0.1:8000`.

The current intended backend layering is:

- `routers/`: HTTP endpoints and transport-level concerns.
- `schemas/`: Pydantic request/response validation and serialization.
- `services/`: business rules, calculations, orchestration, and application validation.
- `repositories/`: database queries and persistence operations.
- `models/`: SQLAlchemy database models.
- `database.py` / `config.py`: database setup and application configuration.

The frontend should render API-provided data. Do not move authoritative financial calculations into React or hardcode financial totals in the UI.

The default currency is NGN, displayed in a readable form such as `₦15,000.00`.

The interface is mobile-first:
- phone layouts use bottom navigation;
- wider desktop layouts use a sidebar;
- wide tables should become readable cards or another suitable compact presentation on narrow screens.

## 5. Financial rules — preserve exactly

These rules are important. Do not reinterpret them casually.

### Money

- Store money as integer kobo in the database and backend.
- The client sends `amount` as a naira string.
- API responses currently use the fields `amount_kobo`, `amount_input`, and `amount_display` where appropriate.
- Reject values with more than two decimal places; do not silently round them.
- The documented maximum amount is NGN 1 trillion. Verify the actual implementation and tests before changing this limit.

### Transactions and savings

- Transaction types are `income` and `expense`.
- A category with `is_savings=True` (the default category is “Savings”) represents money set aside as savings.
- Savings-category expenses are excluded from ordinary expenditure and counted separately as savings.
- The agreed calculation is:

  - `total_expenditure` = expenses excluding savings-category expenses
  - `total_savings` = expenses assigned to savings categories
  - `available_balance` = opening balance + income − total expenditure − total savings
  - `total_wallet` = available balance + total savings

Do not change these definitions without asking.

### Opening balance

- The setting is stored as `opening_balance_kobo`.
- If absent, its value is zero.
- It is not an income transaction.
- The API contract is `GET` and `PUT /api/settings/opening-balance`.
- The opening-balance UI now lives on the Dashboard; it was moved there during Phase 3.

### Loans

- Creating a loan does not create a transaction.
- Outstanding balance is derived: principal + flat interest amount − repayments.
- Outstanding balance is not stored as a separately maintained value.
- Do not introduce compounding or a different interest model without approval.

### Budgets and periods

- Budgets are not expenditure.
- Weekly and monthly budget totals sum their category rows.
- Weeks run Sunday through Saturday.
- Monthly periods start on the first day of the month.
- Do not change period boundaries without approval.

### Categories and data

- Default categories cannot be deleted.
- Categories already used by transactions cannot be deleted.
- Do not insert fabricated/sample transactions into the user's real database.
- Automated tests must use isolated temporary databases or equivalent test fixtures.

## 6. Code quality and the developer's preferred style

The developer prefers code that is structured, readable, descriptive, and understandable without needing an AI agent to explain it.

Use the following principles across languages, adapting them to each language's conventions:

### Structure

- Organise substantial files into logical sections.
- Follow the developer's sequential section style across every programming language: use descriptive numbered headings in substantial files so a reader can follow the work from setup through processing to output. Adapt heading syntax to Python, JavaScript/JSX, CSS, HTML, SQL, and other languages used by the project.
- For a short, single-purpose module, use a concise purpose comment or docstring and only add a numbered heading when it helps explain a real sequence. Do not invent steps to satisfy a numbering pattern.
- Keep functions and components focused on one responsibility.
- Prefer straightforward control flow over clever, compressed expressions.
- Use descriptive names for variables, functions, classes, components, and constants.
- Break long expressions into readable intermediate steps when that makes the logic easier to follow.
- Avoid unnecessary nesting, duplication, magic numbers, and unexplained abbreviations.
- Keep formatting consistent with the existing project and the language's standard conventions.

### Comments and documentation

Comments must add meaning. They should explain intent, reasoning, assumptions, non-obvious behaviour, constraints, or why a particular approach was chosen. Apply this standard consistently in every programming language; use the language's normal comment or documentation syntax.

Good comments answer questions such as:
- Why is this calculation structured this way?
- Why is this validation necessary?
- Why is this database operation performed in this order?
- What business rule or edge case does this block protect?
- Why would changing this line cause a problem?

Do not add comments that merely translate an obvious line into English. Do not comment every line just to increase comment count. Prefer a short explanation at the start of a meaningful section or around a non-obvious decision.

Use:
- Python docstrings for public or non-obvious functions/classes and module purpose where useful.
- JSDoc for exported JavaScript functions or complex public interfaces where useful.
- Short JSX comments for non-obvious rendering decisions only.
- CSS comments for design tokens, layout sections, and non-obvious responsive behaviour.
- SQL comments for complex query logic or important constraints.

For substantial scripts, use clear section headings similar to the developer's preferred analytical-script style:
- imports and configuration;
- data loading or setup;
- validation/preparation;
- core processing;
- results or presentation.
Choose headings that reflect the file's actual responsibilities.

### Language conventions

- Python: `snake_case` for functions and variables; `PascalCase` for classes.
- JavaScript: `camelCase` for variables and functions; `PascalCase` for React components.
- CSS: use the existing project convention; prefer readable `kebab-case` class names.
- SQL: follow the established schema naming and formatting.
- Do not rename existing identifiers simply to impose a different personal preference.

### Maintainability

- Avoid one-letter names except for conventional short-lived loop indices or mathematical notation.
- Avoid giant functions and components.
- Do not create abstractions before there is a real repeated need.
- Keep business logic out of route handlers and React presentation components.
- Keep database queries out of services and routers.
- Avoid broad exception handling that hides the actual error.
- Make error handling explicit and useful without exposing secrets or internal stack traces to users.

## 7. Security and privacy requirements

Read `SECURITY.md` before work involving data, API endpoints, database access, file handling, exports, configuration, dependencies, or logging.

FinLog may contain highly personal financial records. Treat all user financial data as confidential.

- Never commit `data/finlog.db`, database backups, exports containing real user records, `.env`, credentials, tokens, or private keys.
- Keep secrets out of source code, documentation examples, logs, screenshots, test fixtures, and commit history.
- Use parameterised/ORM query mechanisms; never build SQL by concatenating untrusted input.
- Validate all API input at the boundary and enforce business rules in services.
- Do not expose stack traces, SQL statements containing sensitive values, or filesystem paths in user-facing errors.
- Do not log transaction descriptions, account details, or other financial data unless explicitly required and approved.
- Keep CORS restricted to the intended local frontend origin(s); do not use wildcard origins with credentials.
- Do not add authentication, cloud access, telemetry, analytics, or external data transfer without explicit approval.
- Review new dependencies for necessity and maintenance/security implications.

## 8. Testing and verification

- Inspect existing tests before adding or changing behaviour.
- Add or update tests for new business rules, validation, API behaviour, and bug fixes.
- Use temporary test databases. Never run destructive tests against `data/finlog.db`.
- Test boundary cases, invalid input, empty results, and relevant error paths.
- Run the narrowest relevant tests first, then broader checks when practical.
- Clearly distinguish checks that ran from checks that could not run because dependencies, tools, or environment access were unavailable.
- Do not claim the application works end-to-end merely because files compile or static checks pass.

## 9. Git and change management

- Keep changes small and logically grouped.
- Do not amend, rewrite, force-push, reset, or delete branches/commits unless explicitly asked.
- Do not commit unless the user asks you to commit.
- Before suggesting a commit, inspect `git status` and the diff.
- Never stage the real database, backups, `.env`, `.venv`, `node_modules`, build output, or generated personal data.
- Use clear commit messages, for example `feat: add transaction filtering` or `docs: clarify development workflow`.
- Do not claim a pull request, push, or commit was created unless the command succeeded and you verified it.

## 10. Out-of-scope work

Do not implement these in the current project stage unless the user explicitly changes scope:

- payments, subscriptions, premium tiers;
- voice features;
- AI assistant features;
- login/authentication or user accounts;
- cloud deployment or synchronisation;
- unrelated analytics or integrations;
- speculative features not requested by the user.

## 11. Required completion report

At the end of each task, report:

1. **Task completed:** what was actually done.
2. **Files changed:** exact paths.
3. **Important decisions:** explain any non-obvious implementation choice.
4. **Verification:** exact commands/checks run and their outcomes.
5. **Not verified:** what remains untested and why.
6. **Risks or follow-up:** only relevant issues.
7. **Checklist/handoff:** whether either document was updated.

Be concise, factual, and explicit. Never present planned work as completed work.
