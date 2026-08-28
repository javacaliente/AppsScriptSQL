# GoogleScriptSQL Development Plan

## Purpose

This document records what exists today and provides a controlled path for improving it. The project should be characterized before it is refactored. Work should proceed one version at a time, with a review and explicit decision before starting the next version.

## Current release: 0.1.1

Version `0.1.0` represents the imported legacy implementation plus documentation of its current API. Version `0.1.1` adds the first automated characterization suite and narrowly scoped empty/header-only safety fixes. Neither version represents a production-readiness milestone.

### Repository contents

- `code.js`: the complete data access layer implementation in one Google Apps Script file
- `README.md`: installation, usage examples, API summary, and known limitations
- `CHANGELOG.md`: notable changes grouped by project version
- `plan.md`: stabilization rules, release scopes, and future decision gates
- `tests/apps-script-mocks.js`: local mocks for the Apps Script spreadsheet APIs
- `tests/gsql.test.js`: the initial automated characterization and regression suite
- `LICENSE`: MIT License
- `VERSION`: the current project version

There is currently no Apps Script manifest, package configuration, CI workflow, or release automation. The project uses copied-source distribution, a zero-external-dependency Node test harness, and a documented manual release checklist.

### Current data model

- A Google spreadsheet is treated as a database.
- Each worksheet is treated as a table.
- Row 1 contains column names.
- Column 1 is expected to be a numeric `ID` column.
- Inserts generate an ID from the last row's ID.
- Queries read the full used range into an in-memory two-dimensional array.

### Current public API

The implemented methods are:

- Database and schema: `CREATEDB`, `INFOLDER`, `SETTABLES`, `SETCOLUMNS`, `INSERTCOL`
- Context selection: `DB`, `TABLE`
- Create and read: `INSERT`, `SELECT`, `getVal`
- Filtering: `WHERE`, `AND`, `OR`
- Update: `UPDATE`, `VALUES`, `setVal`
- Delete: `DELETEWHERE`, `TRUNCATE`, `DROPTABLE`, `DROPDB`
- Join workflow: `TAKE`, `ANDIN`, `JOINWHERE`
- Incomplete or unused path: `INNERJOIN`

### Problems the project currently solves

- Reduces repeated `SpreadsheetApp` and `DriveApp` boilerplate in small Apps Script projects
- Creates spreadsheet databases, worksheet tables, and column headers from code
- Establishes a consistent table structure with headers and automatically assigned numeric IDs
- Provides a chainable interface for inserting, selecting, updating, and deleting data
- Applies reusable SQL-like conditions to reads, updates, and deletions
- Selects complete rows or only the columns required by the caller
- Provides a basic way to combine selected data from two worksheets
- Centralizes table lifecycle operations such as adding columns, truncating tables, and deleting tables or databases

### Known risks and constraints

#### Correctness

- ID generation is not concurrency-safe and can produce duplicates.
- Missing sheets and missing column names are not validated consistently.
- Some empty-sheet and header-only operations still depend on validation planned for later patches; `0.1.1` covers blank-sheet `SELECT('ALL')`, blank/header-only `TRUNCATE`, and header-only unfiltered updates.
- Several methods mutate caller-provided arrays with `unshift`.
- Stateful query fields can leak between operations when an instance is reused.
- `INNERJOIN` loads data but does not complete a join or return a result.
- Comparison uses loose equality and implicit JavaScript type coercion.
- Destructive methods have no guardrails or confirmation mechanism.

#### Performance

- Reads load every used cell before filtering.
- Multi-row inserts call `appendRow` once per row.
- Some updates write one cell at a time.
- Deletes operate row by row.
- Joins use nested loops and scale quadratically.
- The implementation repeatedly opens the same spreadsheet and sheet.

#### Maintainability

- The data access layer is one large constructor with shared mutable state.
- Public method names and return shapes are inconsistent.
- Errors are mostly surfaced as raw Apps Script failures.
- An initial 10-test suite protects selected CRUD, empty/header-only, ID, loose-comparison, and equality-join paths; coverage of the full public API remains incomplete.
- Distribution and releases are manual; there is no CI or release automation.

## Working rules

1. Characterize current behavior before changing it.
2. Do not combine large refactors with behavior fixes.
3. Preserve the documented API during the pre-1.0 stabilization cycle unless a breaking change is explicitly approved.
4. Add regression coverage for every confirmed bug before fixing it.
5. Prefer batch reads and writes over repeated Apps Script service calls.
6. Treat destructive operations and ID generation as high-risk paths.
7. Keep each release small enough to review in one pass.
8. Stop for review at the end of every phase; later phases are not automatically authorized.
9. Do not add features until the existing API passes the agreed stabilization criteria.
10. Release one new feature per minor version. Its tests and documentation are part of that same version.

## Versioning policy

The project will use [Semantic Versioning](https://semver.org/):

- `MAJOR`: incompatible public API changes
- `MINOR`: one approved backward-compatible feature
- `PATCH`: one backward-compatible fix or one tightly related set of fixes

Until the API is intentionally stabilized, versions remain below `1.0.0`. Git releases should use annotated tags in the form `vX.Y.Z`, while the `VERSION` file contains only `X.Y.Z`.

The version should be changed in the same commit as the release notes and tagged only after that commit is approved. Published tags should not be moved or reused.

Tests, documentation, and internal implementation work do not require separate releases by themselves. They should normally ship with the fix or feature they support. A documentation-only correction may use a patch release when publishing it independently is useful.

### Release checklist

Every fix or feature release follows the same sequence:

1. Define one bounded problem or feature.
2. Add tests that demonstrate the existing behavior and expected result.
3. Make only the changes required for that scope.
4. Run the complete test suite and review the diff.
5. Update the README when user-facing behavior changes.
6. Update `CHANGELOG.md` and `VERSION`.
7. Commit and push only after review.
8. Create and push the annotated version tag only after approval.

## Roadmap

### 0.1.0 — Legacy baseline

Goal: preserve and document the code as received.

- [x] Import the original history and implementation
- [x] Document installation and current API behavior
- [x] Record current limitations
- [x] Introduce a version source
- [x] Add a changelog with the baseline release entry
- [x] Create the annotated `v0.1.0` tag after review

Exit condition: the repository clearly identifies the untouched implementation and its supported surface.

## Stabilization track: 0.1.x

Goal: test and repair the existing feature set before adding anything new.

Patch numbers below are provisional. A suspected bug receives a version only after a test reproduces it and the release scope is approved. If investigation shows that an item is not broken, it is documented rather than changed.

### Characterization gate

Characterization work begins under `Unreleased` and ships with the first applicable patch release. It does not intentionally change runtime behavior. Coverage accumulates across the `0.1.x` stabilization cycle: every path must be characterized before that path changes, and the entire gate must close before feature development begins.

- [x] Choose a zero-external-dependency Node test strategy with Apps Script service mocks
- [x] Add fixtures representing empty, header-only, and populated tables
- [x] Characterize the first insert and legacy initial ID of `0`
- [ ] Characterize multi-row inserts and ID continuation
- [x] Characterize blank/header-only selection, loose `WHERE` equality, filtered and unfiltered updates, `DELETEWHERE`, and `TRUNCATE`
- [ ] Characterize `AND`, `OR`, remaining comparison operators, multi-column updates, and remaining destructive operations
- [x] Characterize equality-join output and loose equality across join columns
- [ ] Characterize non-equality joins and empty/header-only join inputs
- [ ] Record current error behavior for invalid sheets and columns
- [x] Confirm that an Apps Script manifest is not required for the current copied-source workflow

Gate condition: the documented public API has enough automated coverage to distinguish a regression from an intentional fix.

Review gate: decide which surprising behaviors must remain compatible and which are bugs.

### Provisional patch sequence

Each item becomes its own patch release unless investigation proves that two items have the same root cause and should be reviewed together.

- [x] `0.1.1`: establish the characterization harness; make blank-sheet `SELECT('ALL')`, blank/header-only `TRUNCATE`, and header-only unfiltered updates safe
- [ ] `0.1.2` candidate: validate spreadsheet IDs, sheets, columns, operators, and value shapes
- [ ] `0.1.3` candidate: stop mutating caller-provided arrays
- [ ] `0.1.4` candidate: prevent state leakage when a `gSQL` instance is reused
- [ ] `0.1.5` candidate: make sequential ID generation concurrency-safe, likely with `LockService`
- [ ] `0.1.6` candidate: batch inserts and compatible updates while caching spreadsheet and sheet handles within an operation
- [ ] `0.1.7` candidate: add guardrails and clear errors for destructive operations
- [ ] `0.1.8` candidate: remove dead code and decide the disposition of incomplete `INNERJOIN`; implementing a new join capability requires a later feature release

Every confirmed bug must have a failing regression test before its fix. Version order may change after characterization establishes severity and dependencies.

### Performance stabilization

Performance work begins only after correctness stabilization. Each independently reviewable optimization receives its own patch version when it does not add or break public behavior.

- [ ] Verify the `0.1.6` batch and handle-caching changes against representative fixtures
- [ ] Minimize row-by-row deletion work
- [ ] Replace nested-loop equality joins with indexed lookups where possible
- [ ] Benchmark core operations with tables of up to 10,000 rows and 50 columns
- [ ] Test up to five simultaneous callers, allow concurrent reads, and serialize writes
- [ ] Document measured limits and redirect larger or high-frequency workloads to a database

Stabilization exit conditions:

- The current public API and its edge cases have automated coverage.
- Confirmed data-corruption and invalid-input bugs are fixed or explicitly documented and deferred.
- Normal concurrent inserts cannot silently duplicate IDs.
- Destructive operations have reviewed behavior and regression coverage.
- Core operations avoid clearly unnecessary Apps Script service calls.
- All supported behavior is reflected in the README.

No feature release may begin until these conditions are reviewed and accepted.

## Feature track: 0.2.0 and later

After stabilization, each approved feature receives its own minor version:

- `0.2.0`: proposed explicit `strict` and controlled `coerce` comparison modes
- `0.3.0`: second approved feature
- `0.4.0`: third approved feature

Feature numbers are placeholders, not authorization to implement anything. The feature backlog will be prioritized only after stabilization. A minor release contains one user-visible feature together with its tests, documentation, and any internal work required to support it. The `0.2.0` comparison feature requires a written policy for numbers, numeric strings, booleans, blanks, dates, and identifiers with leading zeros before implementation.

Large API redesigns require a written proposal before implementation. That proposal must address compatibility with the uppercase API, return and error types, installation method, and migration guidance. A proposal does not authorize a rewrite.

## 1.0.0 — Stable release criteria

Version `1.0.0` should not be scheduled until all of the following are true:

- The supported public API is explicitly defined.
- Core behavior and edge cases have automated tests.
- Concurrency and destructive-operation behavior are documented and tested.
- Installation and release processes are repeatable.
- Deprecated behavior has a documented migration path.
- Performance limits are measured and documented.

## Decisions recorded for stabilization

- Backward compatibility with the current uppercase API is not required because the project has not been rolled out.
- The shipped library remains a zero-dependency Apps Script source file for now. External development dependencies require separate approval.
- Distribution remains copy-the-source deployment for now; an Apps Script library deployment and `clasp` workflow are deferred.
- Current loose comparison behavior remains unchanged throughout `0.1.x` and must be characterized by tests. Explicit comparison modes are deferred to the proposed `0.2.0` feature.
- The provisional support target is 10,000 rows and 50 columns per table with up to five simultaneous callers. Reads may run concurrently; writes must be serialized.
- IDs remain sequential numbers during characterization. The choice between concurrency-safe sequential IDs and a different identifier format remains open until the `0.1.5` scope is reviewed.

No runtime behavior should change until the relevant patch scope and expected result are reviewed.

## Decisions needed before the first feature

1. Confirm that the stabilization exit conditions have been met.
2. Choose exactly one feature and define its acceptance criteria.
3. Confirm whether the feature is backward-compatible.
4. Assign the next minor version only after the scope is approved.
