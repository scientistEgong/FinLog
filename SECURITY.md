# FinLog Security Policy

## 1. Purpose and data sensitivity

FinLog is a personal finance application. Its database may contain transaction histories, income, spending patterns, budgets, loans, repayments, and descriptive notes. Treat this information as confidential personal data.

This document sets minimum development and handling requirements. It is not a claim that the application has undergone a formal security audit or that every control is already implemented.

## 2. Current security posture and scope

The current intended deployment is local use on a Windows computer:

- React + Vite frontend.
- FastAPI backend.
- SQLAlchemy persistence layer.
- SQLite database stored under `data/`.

Do not assume local-only operation makes the application automatically secure. Local files, local API ports, browser access, backups, exports, and development tooling can still expose data.

Authentication, cloud deployment, multi-user access, and remote synchronisation are not currently approved features. Do not add them without explicit product approval and a separate threat review.

## 3. Data protection

### Never commit private data or secrets

The following must not be committed:

- `data/finlog.db` or any live database containing real financial records;
- database backups, including files under `data/backups/`;
- exports containing real transactions or other private records;
- `.env` files and credentials;
- API tokens, passwords, private keys, certificates, or signing secrets;
- logs, screenshots, or test fixtures containing real financial data.

If an `.env.example` is added, keep it limited to placeholder values; no `.env.example` currently exists in the repository.

The `.gitignore` must exclude private runtime data, virtual environments, dependency folders, local environment files, backups, and generated build artefacts. Verify the actual ignore rules rather than assuming they work.

### Data minimisation

- Collect and store only data required by an approved feature.
- Do not add telemetry, analytics, third-party reporting, or external data transfer without explicit approval.
- Do not copy real financial records into test data, documentation, issue descriptions, or screenshots.
- Prefer synthetic data for demonstrations and automated tests.

## 4. Database security and integrity

- Use SQLAlchemy's parameterised query mechanisms or safely parameterised SQL.
- Never concatenate user input into SQL statements.
- Enable and verify SQLite foreign-key enforcement.
- Apply database constraints where appropriate, in addition to application validation.
- Use transactions for multi-step operations that must succeed or fail together.
- Avoid destructive schema changes and data migrations without a reviewed migration plan.
- Do not assume `create_all()` modifies existing tables; schema evolution must use an approved migration strategy.
- Automated tests must use isolated temporary databases, never the live database.
- Do not run reset, drop, truncate, seed, or destructive migration commands against the user's real database.

Before real financial records are entered, the database migration baseline and backup/restore approach should be established and tested.

## 5. API and input validation

- Validate request data with Pydantic schemas at the API boundary.
- Enforce financial business rules in the service layer.
- Validate identifiers, date ranges, pagination values, string lengths, numeric limits, and enum values.
- Reject malformed monetary values; do not silently round invalid precision.
- Use allow-listed sorting/filtering fields if dynamic sorting or filtering is introduced.
- Return appropriate HTTP status codes and safe error messages.
- Do not return stack traces, internal file paths, secrets, SQL details, or raw exception messages to clients.
- Apply reasonable limits to request sizes and result pagination.

## 6. Money and financial correctness

Financial correctness is a security and integrity concern.

- Store monetary amounts as integer kobo.
- Do not use binary floating-point values as the authoritative representation of money.
- Preserve the approved rules for savings, expenditure, balances, budgets, opening balance, loans, and repayments.
- Add tests for boundaries, invalid precision, negative values where disallowed, overflow limits, and rounding/display behaviour.
- Do not silently change financial formulas or period definitions.

## 7. Frontend and browser considerations

- Treat all user-entered text as untrusted.
- Avoid unsafe HTML injection and direct use of `dangerouslySetInnerHTML`; if a genuine requirement arises, obtain approval and use a reviewed sanitisation approach.
- Do not store secrets in frontend code or Vite environment variables exposed to the browser.
- Do not rely on client-side validation as the only validation.
- Keep the UI from displaying internal error details or sensitive debugging output.
- Do not add third-party scripts, remote fonts, trackers, or external services without approval.

## 8. Local network and CORS

- Bind development services to the intended local interface unless the user explicitly requests network access.
- Keep CORS origins restricted to the actual frontend development origin(s).
- Do not combine wildcard origins with credentialed requests.
- Do not expose the API to a public network as part of routine development.
- If LAN access or remote deployment is later proposed, perform a separate review of authentication, authorisation, transport security, secrets, and network exposure first.

## 9. Files, exports, and backups

- Restrict file operations to intended application directories.
- Validate file names and paths; prevent path traversal.
- Do not overwrite the live database when creating, restoring, or importing a backup without explicit confirmation and a tested recovery procedure.
- Exports must contain only the data requested by the user.
- Treat CSV exports carefully because spreadsheet applications may interpret cells beginning with formula characters as formulas. Mitigate CSV formula injection where applicable.
- Backups should be stored separately from source control and protected by appropriate local file permissions.
- A backup is not proven useful until restoration has been tested.

## 10. Logging and error handling

- Do not log full transaction records, personal notes, account details, credentials, or tokens.
- Prefer operational metadata such as request outcome, duration, and non-sensitive error category.
- Redact sensitive values from exception and diagnostic output.
- Catch exceptions at appropriate boundaries; do not suppress errors or return success after a failed operation.
- Keep detailed diagnostics in controlled development logs, not in client responses.

## 11. Dependencies and supply chain

Before adding a dependency:

1. Explain why the existing stack cannot reasonably meet the need.
2. Check whether the dependency is maintained and appropriate.
3. Review its licence and known security concerns where practical.
4. Add only the required package and update the relevant lock/requirements file.
5. Document the purpose if it is not self-evident.

Do not upgrade large groups of dependencies during an unrelated feature task.

## 12. Security review checklist

Before completing a security-sensitive change, consider:

- [ ] Is all input validated?
- [ ] Are database operations parameterised?
- [ ] Are permissions and file paths constrained?
- [ ] Could private financial data appear in logs or errors?
- [ ] Are secrets kept out of source and frontend bundles?
- [ ] Are CORS and network exposure appropriate?
- [ ] Are tests isolated from the real database?
- [ ] Are relevant tests and checks run?
- [ ] Are migration and backup implications understood?
- [ ] Has the diff been checked for accidental data or secrets?

## 13. Reporting vulnerabilities

Do not publish sensitive vulnerability details, credentials, or exploit instructions in public repository issues. Report the affected component, impact, reproduction conditions, and a proposed mitigation privately to the repository owner.

No public security contact address is specified in this repository. Do not invent one.
