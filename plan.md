# GoogleScriptSQL Development Plan

## Purpose

This document records what exists today and provides a controlled path for improving it. The project should be characterized before it is refactored. Work should proceed one version at a time, with a review and explicit decision before starting the next version.

## Current baseline: 0.1.0

Version `0.1.0` represents the imported legacy implementation plus documentation of its current API. It is a baseline, not a production-readiness milestone.

### Repository contents

- `code.js`: the complete library implementation in one Google Apps Script file
- `README.md`: installation, usage examples, API summary, and known limitations
- `LICENSE`: MIT License
- `VERSION`: the current project version

There is currently no Apps Script manifest, automated test suite, package configuration, changelog, CI workflow, or release automation.

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
- Empty sheets and header-only tables can produce invalid range or row operations.
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

- The library is one large constructor with shared mutable state.
- Public method names and return shapes are inconsistent.
- Errors are mostly surfaced as raw Apps Script failures.
- Behavior is not protected by tests.
- There is no formal distribution or release process.

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

Characterization work begins under `Unreleased` and ships with the first applicable patch release. It does not intentionally change runtime behavior.

- [ ] Choose a test strategy for Apps Script service mocks
- [ ] Add fixtures representing empty, header-only, and populated tables
- [ ] Characterize insert and ID behavior
- [ ] Characterize select, filter, update, and delete behavior
- [ ] Characterize join output and type coercion
- [ ] Record current error behavior for invalid sheets and columns
- [ ] Add an Apps Script manifest if the chosen test/deployment workflow requires it

Gate condition: the documented public API has enough automated coverage to distinguish a regression from an intentional fix.

Review gate: decide which surprising behaviors must remain compatible and which are bugs.

### Provisional patch sequence

Each item becomes its own patch release unless investigation proves that two items have the same root cause and should be reviewed together.

- [ ] `0.1.1` candidate: make empty and header-only tables safe
- [ ] `0.1.2` candidate: validate spreadsheet IDs, sheets, columns, operators, and value shapes
- [ ] `0.1.3` candidate: stop mutating caller-provided arrays
- [ ] `0.1.4` candidate: make sequential ID generation concurrency-safe, likely with `LockService`
- [ ] `0.1.5` candidate: prevent state leakage when a `gSQL` instance is reused
- [ ] `0.1.6` candidate: decide and implement the disposition of incomplete `INNERJOIN`
- [ ] `0.1.7` candidate: add guardrails and clear errors for destructive operations

Every confirmed bug must have a failing regression test before its fix. Version order may change after characterization establishes severity and dependencies.

### Performance stabilization

Performance work begins only after correctness stabilization. Each independently reviewable optimization receives its own patch version when it does not add or break public behavior.

- [ ] Cache spreadsheet and sheet handles within an operation
- [ ] Batch multi-row inserts with `setValues`
- [ ] Batch compatible updates
- [ ] Minimize row-by-row deletion work
- [ ] Replace nested-loop equality joins with indexed lookups where possible
- [ ] Add representative size benchmarks
- [ ] Document practical sheet-size limits

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

- `0.2.0`: first approved feature
- `0.3.0`: second approved feature
- `0.4.0`: third approved feature

Feature numbers are placeholders, not authorization to implement anything. The feature backlog will be prioritized only after stabilization. A minor release contains one user-visible feature together with its tests, documentation, and any internal work required to support it.

Large API redesigns require a written proposal before implementation. That proposal must address compatibility with the uppercase API, return and error types, installation method, and migration guidance. A proposal does not authorize a rewrite.

## 1.0.0 — Stable release criteria

Version `1.0.0` should not be scheduled until all of the following are true:

- The supported public API is explicitly defined.
- Core behavior and edge cases have automated tests.
- Concurrency and destructive-operation behavior are documented and tested.
- Installation and release processes are repeatable.
- Deprecated behavior has a documented migration path.
- Performance limits are measured and documented.

## Decisions needed before stabilization work

1. Is backward compatibility with the current uppercase API required?
2. Should this remain a zero-dependency Apps Script file or adopt a `clasp`-based development workflow?
3. Is the library intended for copied source, an Apps Script library deployment, or both?
4. Should IDs remain sequential numbers, or may they become UUIDs or another safer identifier?
5. Should loose comparison remain available for compatibility?
6. What sheet sizes and request concurrency should the project support?

The test strategy can be investigated before all product decisions are final. No runtime behavior should change until the relevant decision and patch scope are reviewed.

## Decisions needed before the first feature

1. Confirm that the stabilization exit conditions have been met.
2. Choose exactly one feature and define its acceptance criteria.
3. Confirm whether the feature is backward-compatible.
4. Assign the next minor version only after the scope is approved.
