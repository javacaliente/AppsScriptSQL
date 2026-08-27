# GoogleScriptSQL

GoogleScriptSQL is a single-file, SQL-inspired data access layer for Google Sheets projects built with Apps Script.

Each spreadsheet acts as a database, each sheet acts as a table, the first row contains column names, and the first column is an automatically managed numeric `ID`.

Current version: [`0.1.0`](VERSION). See the [development plan](plan.md) for the current-state assessment and staged roadmap.

## Development status

The `0.1.x` cycle is reserved for testing and repairing the existing implementation. New features will not be added until the current API passes the stabilization criteria in the development plan. Each patch release will contain one fix or one tightly related set of fixes.

After stabilization, each approved feature will receive its own minor version. The first proposed feature release, `0.2.0`, will define explicit strict and controlled-coercion comparison modes. Until then, the current loose comparison behavior remains unchanged and will be covered by characterization tests.

## Features

- Create a spreadsheet database, tables, and columns
- Insert one or many rows with generated IDs
- Select all rows or specific columns
- Filter with `WHERE`, `AND`, and `OR`
- Compare values using `=`, `!=`, `>`, `<`, `>=`, and `<=`
- Update or delete matching rows
- Add columns, truncate tables, and delete tables or databases
- Join selected data from two sheets

## Requirements

- A Google account
- A Google Apps Script project
- Permission to access Google Sheets and Google Drive

This project runs only in Google Apps Script. It does not require an API key, npm package, or external database.

## Installation

GoogleScriptSQL currently uses copied-source deployment. It is not published as an official versioned Apps Script Library.

1. Open or create a project at [Google Apps Script](https://script.google.com/).
2. Add a script file to the project.
3. Copy the contents of [`code.js`](code.js) into that file.
4. Save the project and authorize Sheets and Drive access when Google prompts you.

Create a fresh instance for each independent operation:

```javascript
var sql = new gSQL();
```

## Data model

A table is a worksheet with headers in row 1:

| ID | Name | Email | Active |
|---:|---|---|---|
| 1 | Ada | ada@example.com | true |
| 2 | Grace | grace@example.com | false |

The data access layer expects the ID column to be first. `SETCOLUMNS` creates it automatically, and `INSERT` assigns IDs based on the last row's ID.

## Create a database

```javascript
var result = new gSQL()
  .CREATEDB('Customer database')
  .SETTABLES('Customers')
  .SETCOLUMNS(['Name', 'Email', 'Active']);

Logger.log(result);
```

Create several tables at once by passing arrays. The column arrays must be in the same order as the table names:

```javascript
new gSQL()
  .CREATEDB('Store database')
  .SETTABLES(['Customers', 'Orders'])
  .SETCOLUMNS([
    ['Name', 'Email'],
    ['CustomerID', 'Total']
  ]);
```

To create the spreadsheet inside a Drive folder, call `INFOLDER(folderId)` after `CREATEDB` and before defining the tables.

## Use an existing spreadsheet

Copy the spreadsheet ID from its URL:

```text
https://docs.google.com/spreadsheets/d/SPREADSHEET_ID/edit
```

Then select a sheet with `DB` and `TABLE`:

```javascript
var databaseId = 'SPREADSHEET_ID';
var sql = new gSQL().DB(databaseId).TABLE('Customers');
```

## Insert rows

Do not include an ID; `INSERT` prepends it automatically.

```javascript
// One row
new gSQL()
  .DB(databaseId)
  .TABLE('Customers')
  .INSERT(['Ada', 'ada@example.com', true]);

// Several rows
new gSQL()
  .DB(databaseId)
  .TABLE('Customers')
  .INSERT([
    ['Grace', 'grace@example.com', false],
    ['Linus', 'linus@example.com', true]
  ]);
```

## Select data

Use `SELECT('ALL')` for complete rows, a string for one column, or an array for several columns. Finish the chain with `getVal()`.

```javascript
var allCustomers = new gSQL()
  .DB(databaseId)
  .TABLE('Customers')
  .SELECT('ALL')
  .getVal();

var emails = new gSQL()
  .DB(databaseId)
  .TABLE('Customers')
  .SELECT('Email')
  .getVal();

var namesAndEmails = new gSQL()
  .DB(databaseId)
  .TABLE('Customers')
  .SELECT(['Name', 'Email'])
  .getVal();
```

The returned arrays contain data rows only; the header row is removed.

## Filter data

```javascript
var activeCustomers = new gSQL()
  .DB(databaseId)
  .TABLE('Customers')
  .SELECT(['Name', 'Email'])
  .WHERE('Active', '=', true)
  .getVal();

var selectedCustomers = new gSQL()
  .DB(databaseId)
  .TABLE('Customers')
  .SELECT('ALL')
  .WHERE('Active', '=', true)
  .AND('ID', '>=', 10)
  .OR('Email', '=', 'admin@example.com')
  .getVal();
```

Supported comparison operators are `=`, `!=`, `>`, `<`, `>=`, and `<=`.

### Current comparison behavior

The current implementation uses JavaScript's loose equality operators (`==` and `!=`) and implicit type conversion during comparisons. Values with different types can therefore match:

```javascript
1 == '1'    // true
false == 0  // true
'' == 0     // true
```

This behavior affects `WHERE`, `AND`, `OR`, filtered updates, `DELETEWHERE`, and `JOINWHERE`. Callers should validate and normalize filter values before operations that update or delete data.

This behavior is documented as a current limitation. It will remain unchanged until the comparison cases are covered by tests and a replacement policy is explicitly approved.

## Update rows

Use `UPDATE` to choose one or more columns, `VALUES` to supply their replacement values, and `setVal()` to write the changes.

```javascript
// Update matching rows
new gSQL()
  .DB(databaseId)
  .TABLE('Customers')
  .UPDATE('Active')
  .VALUES(false)
  .WHERE('Email', '=', 'ada@example.com')
  .setVal();

// Update several columns
new gSQL()
  .DB(databaseId)
  .TABLE('Customers')
  .UPDATE(['Email', 'Active'])
  .VALUES(['new-address@example.com', true])
  .WHERE('ID', '=', 1)
  .setVal();
```

If no `WHERE` clause is supplied, `setVal()` updates every data row in the selected column or columns.

## Delete rows

```javascript
new gSQL()
  .DB(databaseId)
  .TABLE('Customers')
  .DELETEWHERE('Active', '=', false);
```

## Join two tables

`TAKE`, `ANDIN`, and `JOINWHERE` combine selected columns from two sheets in the same spreadsheet:

```javascript
var customerOrders = new gSQL()
  .DB(databaseId)
  .TABLE('Customers')
  .TAKE(['ID', 'Name'])
  .ANDIN('Orders')
  .TAKE(['CustomerID', 'Total'])
  .JOINWHERE('ID', '=', 'CustomerID');
```

`JOINWHERE` supports the same comparison operators as `WHERE` and returns the matching values as an array. It does not include headers.

## Schema and destructive operations

```javascript
// Add one or more columns
new gSQL().DB(databaseId).TABLE('Customers').INSERTCOL('CreatedAt');
new gSQL().DB(databaseId).TABLE('Customers').INSERTCOL(['City', 'Country']);

// Delete every data row while keeping the header
new gSQL().DB(databaseId).TABLE('Customers').TRUNCATE();

// Delete a worksheet
new gSQL().DB(databaseId).TABLE('Customers').DROPTABLE();

// Move the entire spreadsheet to Google Drive trash
new gSQL().DB(databaseId).DROPDB();
```

`TRUNCATE`, `DROPTABLE`, and `DROPDB` are destructive. Test them against a disposable spreadsheet first.

## API summary

| Method | Purpose |
|---|---|
| `CREATEDB(name)` | Create a spreadsheet and select it as the current database |
| `INFOLDER(folderId)` | Move a newly created database into a Drive folder |
| `SETTABLES(names)` | Create one or more worksheets |
| `SETCOLUMNS(columns)` | Add headers, including the generated `ID` column |
| `DB(spreadsheetId)` | Select an existing spreadsheet |
| `TABLE(name)` | Select a worksheet |
| `INSERT(data)` | Insert one row or multiple rows |
| `SELECT(columns)` | Select all, one, or several columns |
| `WHERE(column, operator, value)` | Filter selected rows |
| `AND(column, operator, value)` | Narrow the current result |
| `OR(column, operator, value)` | Add matches from the original selection |
| `getVal()` | Return selected values |
| `UPDATE(columns)` | Choose columns to update |
| `VALUES(values)` | Set replacement values |
| `setVal()` | Write an update |
| `DELETEWHERE(column, operator, value)` | Delete matching rows |
| `INSERTCOL(names)` | Add columns to a table |
| `TAKE(columns)` | Select columns for one side of a join |
| `ANDIN(table)` | Select the second table for a join |
| `JOINWHERE(left, operator, right)` | Join two selected datasets |
| `TRUNCATE()` | Delete all data rows from a table |
| `DROPTABLE()` | Delete a worksheet |
| `DROPDB()` | Move the spreadsheet to Drive trash |

## Limitations

- This is a convenience layer over Google Sheets, not a relational database or SQL parser.
- Reads load the full used range of a sheet into memory before filtering.
- Writes are not transactional and do not provide concurrency control.
- Operations are subject to Google Apps Script execution time and service quotas.
- Column names must exactly match the header text.
- Comparisons can coerce values of different JavaScript types and may match more rows than expected.
- IDs assume that the last data row contains the highest numeric ID.

## Documentation and demo

## License

Licensed under the [MIT License](LICENSE).
