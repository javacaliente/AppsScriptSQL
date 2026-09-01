# Changelog

All notable changes to this project will be documented in this file.

The project follows [Semantic Versioning](https://semver.org/).

## [Unreleased]

## [0.1.1] - 2026-08-27

### Added

- Added a zero-external-dependency Node test harness with Apps Script spreadsheet mocks.
- Added characterization coverage for blank, header-only, and populated tables.
- Locked in the legacy first generated ID of `0` and loose comparison behavior for later review.

### Fixed

- Made `SELECT('ALL')` return an empty array for a completely blank sheet.
- Made `TRUNCATE()` a safe no-op for blank and header-only sheets.
- Made unfiltered updates a safe no-op when a table contains headers but no data rows.

## [0.1.0] - 2026-08-27

### Added

- Established the imported Google Apps Script implementation as the legacy baseline.
- Documented installation, the data model, the public API, usage examples, and current limitations.
- Added a staged development plan with review gates between releases.
- Introduced Semantic Versioning with a repository-level `VERSION` file.

### Changed

- Replaced the original minimal README with documentation based on the current codebase.
- Removed obsolete links to documentation and demos maintained by the original author.

[Unreleased]: https://github.com/javacaliente/AppsScriptSQL/compare/v0.1.1...HEAD
[0.1.1]: https://github.com/javacaliente/AppsScriptSQL/compare/v0.1.0...v0.1.1
[0.1.0]: https://github.com/javacaliente/AppsScriptSQL/releases/tag/v0.1.0
