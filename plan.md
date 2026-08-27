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

- Reduces repeated `SpreadsheetApp` boilerplate for small Apps Script projects
- Gives simple Sheets-backed applications a chainable CRUD interface
- Provides basic filtering without requiring callers to write array traversal code
- Creates a consistent header-and-ID convention across worksheets
- Provides a basic way to combine selected data from two worksheets

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

## Versioning policy

The project will use [Semantic Versioning](https://semver.org/):

- `MAJOR`: incompatible public API changes
- `MINOR`: backward-compatible functionality or meaningful internal improvements
- `PATCH`: backward-compatible fixes and documentation corrections

Until the API is intentionally stabilized, versions remain below `1.0.0`. Git releases should use annotated tags in the form `vX.Y.Z`, while the `VERSION` file contains only `X.Y.Z`.

The version should be changed in the same commit as the release notes and tagged only after that commit is approved. Published tags should not be moved or reused.

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

### 0.2.0 — Characterization and safety net

Goal: make current behavior observable without intentionally changing it.

- [ ] Choose a test strategy for Apps Script service mocks
- [ ] Add fixtures representing empty, header-only, and populated tables
- [ ] Characterize insert and ID behavior
- [ ] Characterize select, filter, update, and delete behavior
- [ ] Characterize join output and type coercion
- [ ] Record current error behavior for invalid sheets and columns
- [ ] Add an Apps Script manifest if the chosen test/deployment workflow requires it
- [ ] Add a changelog and repeatable release checklist

Exit condition: the documented public API has automated characterization coverage, including known edge cases.

Review gate: decide which surprising behaviors must remain compatible and which are bugs.

### 0.3.0 — Correctness and validation

Goal: address confirmed data-corruption and invalid-input risks.

- [ ] Validate spreadsheet IDs, sheet names, column names, operators, and value shapes
- [ ] Make empty and header-only tables safe
- [ ] Stop mutating caller-provided arrays
- [ ] Make IDs safe under concurrent Apps Script executions, likely with `LockService`
- [ ] Define and enforce instance reuse behavior
- [ ] Add clear errors for invalid operations
- [ ] Decide whether to complete, deprecate, or remove `INNERJOIN`
- [ ] Add regression tests for every fix

Exit condition: common invalid inputs fail clearly and normal concurrent inserts cannot silently duplicate IDs.

Review gate: approve any compatibility changes discovered during correctness work.

### 0.4.0 — Batch operations and performance

Goal: reduce Apps Script service calls without changing approved behavior.

- [ ] Cache spreadsheet and sheet handles within an operation
- [ ] Batch multi-row inserts with `setValues`
- [ ] Batch compatible updates
- [ ] Minimize row-by-row deletion work
- [ ] Replace nested-loop equality joins with indexed lookups where possible
- [ ] Add representative size benchmarks
- [ ] Document practical sheet-size limits

Exit condition: CRUD operations use bounded service calls where the Sheets API permits it, with benchmark evidence.

### 0.5.0 — API design proposal

Goal: design the maintainable API before rewriting the public surface.

- [ ] Inventory naming and return-type inconsistencies
- [ ] Decide whether legacy uppercase methods remain supported
- [ ] Define query result and error types
- [ ] Define transaction and concurrency expectations explicitly
- [ ] Decide the supported installation model: copied source, Apps Script library, or `clasp`
- [ ] Publish a migration proposal with examples

Exit condition: a reviewed API specification and migration policy exist. This phase does not itself authorize a breaking rewrite.

### 1.0.0 — Stable release criteria

Version `1.0.0` should not be scheduled until all of the following are true:

- The supported public API is explicitly defined.
- Core behavior and edge cases have automated tests.
- Concurrency and destructive-operation behavior are documented and tested.
- Installation and release processes are repeatable.
- Deprecated behavior has a documented migration path.
- Performance limits are measured and documented.

## Decisions needed before 0.2.0

1. Is backward compatibility with the current uppercase API required?
2. Should this remain a zero-dependency Apps Script file or adopt a `clasp`-based development workflow?
3. Is the library intended for copied source, an Apps Script library deployment, or both?
4. Should IDs remain sequential numbers, or may they become UUIDs or another safer identifier?
5. Should loose comparison remain available for compatibility?
6. What sheet sizes and request concurrency should the project support?

No implementation work for `0.2.0` should begin until these choices and the scope of that release are reviewed.
