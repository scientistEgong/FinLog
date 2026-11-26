# Contributing to FinLog

This guide describes how to make changes that remain understandable, testable, and consistent with the project's architecture.

## 1. Before you start

Read:

1. `AGENTS.md`
2. `HANDOFF.md`
3. `PROJECT_CHECKLIST.md`
4. `SECURITY.md`

Inspect the current implementation before relying on this guide as evidence of what already exists. The repository may have changed since this document was written.

## 2. Development principles

FinLog should be built incrementally. Prefer a small, complete, verified feature over a large collection of partially working files.

- Understand the requirement before coding.
- Preserve existing architecture and naming.
- Keep responsibilities in the correct layer.
- Prefer readable code over clever or compressed code.
- Avoid unrelated refactoring.
- Add tests alongside behaviour changes.
- Document important decisions and limitations.
- Ask before changing scope, dependencies, schemas, or API contracts.

## 3. Architecture boundaries

The intended backend request flow is:

`router → service → repository → database`

Responsibilities:

| Area | Responsibility | Avoid |
|---|---|---|
| Router | HTTP method, path, request/response wiring, status codes | Business calculations and direct database queries |
| Schema | Request validation and response shape | Database access and business orchestration |
| Service | Business rules, calculations, validation, orchestration | Direct SQL/database queries |
| Repository | Database queries and persistence | HTTP concerns and presentation logic |
| Model | Database structure and relationships | API-specific response formatting |
| Frontend page/component | User interaction and presentation | Authoritative financial calculations or hardcoded financial totals |

Each backend layer should call only the layer directly below it. Follow existing project patterns and inspect current code before adding a new abstraction.

## 4. Preferred code style

The developer's preferred style is structured and explanatory, similar to a well-organised analytical script: numbered sections show the sequence of work at a glance, names are descriptive, expressions are readable, and comments explain the reasoning behind important operations. Apply this consistently in every language, using that language's comment syntax.

Use numbered section headings in substantial files and scripts. A short, single-purpose component or module can use a concise purpose comment instead of invented numbered steps. Headings should describe the actual sequence and responsibilities in the file.

### Naming

- Use names that communicate purpose.
- Python: `snake_case` for functions and variables; `PascalCase` for classes.
- JavaScript: `camelCase` for variables/functions; `PascalCase` for React components.
- CSS: use clear, consistent class names, normally `kebab-case`.
- Keep existing identifiers unless a rename is necessary and approved.

Prefer `transaction_total` over `total`, `opening_balance_kobo` over `balance`, and `is_savings_category` over an ambiguous boolean name when those names accurately describe the value.

### File organisation

For substantial modules, organise related code into numbered logical sections. Examples include:

- setup and imports;
- configuration/constants;
- data loading or request preparation;
- validation and transformation;
- core business logic;
- output, response, or presentation.

Use headings that reflect the actual file and its order of operations. Apply equivalent section comments in JSX, CSS, HTML, and SQL when the file has distinct responsibilities. Avoid unnecessary section headers in small files.

### Comments

Write comments to explain *why*, not merely *what*.

Useful comment:
```python
# Savings transfers are tracked separately so they do not inflate ordinary expenditure.
total_expenditure = calculate_non_savings_expenses(transactions)
```

Unhelpful comment:
```python
# Calculate total expenditure.
total_expenditure = calculate_non_savings_expenses(transactions)
```

Do not comment every line. Prefer good names and small functions first. Add comments for non-obvious rules, edge cases, assumptions, workarounds, and decisions that a future maintainer might otherwise misunderstand. At a meaningful section boundary, a concise comment should make that part's purpose clear without narrating obvious statements.

### Functions and components

- Keep each function/component focused.
- Use intermediate variables when they make a multi-step calculation easier to follow.
- Avoid deeply nested conditionals where guard clauses or small helpers improve clarity.
- Keep UI rendering separate from data access and business rules.
- Avoid premature abstractions and excessive fragmentation.

### Formatting

- Follow the project's existing formatter/linter configuration.
- Use the language's standard formatting conventions.
- Do not introduce a formatter or broad formatting rewrite without approval.
- Keep imports organised and remove unused imports.
- Avoid unexplained magic numbers; use named constants where appropriate.

## 5. Financial implementation rules

Preserve these rules unless the developer explicitly approves a change:

- Authoritative monetary values are integer kobo.
- The client sends `amount` as a naira string.
- Values with more than two decimal places are rejected rather than rounded.
- Transaction types are `income` and `expense`.
- Savings-category expenses are tracked separately from ordinary expenditure.
- Opening balance is a setting, not an income transaction.
- Loans do not create transactions.
- Loan outstanding amount is derived from principal + flat interest − repayments.
- Budgets are not expenditure.
- Weeks run Sunday through Saturday.
- Monthly budget periods begin on the first day of the month.

Refer to `AGENTS.md` for the agreed calculation definitions.

## 6. Tests

- Add tests for new behaviour and bug fixes.
- Test valid, invalid, boundary, and empty-result cases.
- Test financial calculations with exact integer-kobo expectations.
- Use temporary test databases or isolated fixtures.
- Never run destructive tests against `data/finlog.db`.
- Do not add fabricated records to the real database.
- Run the narrowest relevant test first, then broader checks when practical.

Report exact commands and results. If a check could not run, say why.

## 7. API changes

Before changing an API:

- inspect current routes, schemas, services, repositories, and frontend callers;
- identify whether the change is backward-compatible;
- explain any request/response contract change;
- update tests and relevant documentation;
- obtain approval for material contract changes.

Do not return database models directly where the established API uses response schemas.

## 8. Database changes

Database schema changes require particular care.

- Inspect current models and database state assumptions.
- Explain migration and compatibility implications.
- Do not assume `create_all()` updates existing tables.
- Use the approved Alembic migration approach once established.
- Never reset or recreate the user's live database to make a schema change work.
- Do not ask the user to enter real data until the migration baseline and backup/restore process are ready.

## 9. Pull requests and commits

Keep each change focused and reviewable.

Before proposing a commit:
- inspect `git status`;
- review the complete diff;
- check for secrets, local files, database files, backups, and generated artefacts;
- ensure documentation and tests match the actual change.

Do not commit, push, amend, or create a pull request unless explicitly asked.

Suggested commit prefixes:
- `feat:` new functionality
- `fix:` bug fix
- `docs:` documentation
- `test:` tests
- `refactor:` internal restructuring without intended behaviour change
- `chore:` maintenance

## 10. Completion summary

Every completed task should state:

- what changed;
- which files changed;
- important implementation decisions;
- tests/checks run and their actual outcomes;
- anything not verified;
- relevant risks or next steps;
- whether `HANDOFF.md` or `PROJECT_CHECKLIST.md` changed.
