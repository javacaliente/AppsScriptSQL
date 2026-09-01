# Getting started with AppsScriptSQL

AppsScriptSQL runs inside Google Apps Script. It is copied into your Apps Script project as source code; it is not installed from npm or added as a versioned Apps Script Library.

You can either attach the script to a Google spreadsheet or use a standalone Apps Script project. Attaching it to a spreadsheet is the simplest way to get started.

## Option 1: Attach it to a Google spreadsheet

1. Create or open a spreadsheet in Google Sheets.
2. Select **Extensions > Apps Script**.
3. In the Apps Script editor, rename the existing `Code.gs` file to `gSQL.gs`, or create a new `gSQL.gs` file.
4. Copy the entire contents of [`code.js`](code.js) into `gSQL.gs`.
5. Create another script file named `Main.gs` for your own functions.
6. Save the project.

Keep the copied library code and your own functions in separate files so that updating `gSQL.gs` later is straightforward.

### Initialize the attached spreadsheet

The following function turns a new, blank spreadsheet into a database with a `Customers` table. `SETCOLUMNS` adds the required `ID` column automatically.

```javascript
function initializeDatabase() {
  var databaseId = SpreadsheetApp.getActiveSpreadsheet().getId();

  var result = new gSQL()
    .DB(databaseId)
    .SETTABLES('Customers')
    .SETCOLUMNS(['Name', 'Email', 'Active']);

  Logger.log(result);
}
```

This initialization removes the spreadsheet's original default sheet after creating the new table. Run it only once on a new or disposable spreadsheet.

### Run the function and authorize access

1. Select `initializeDatabase` from the function list in the Apps Script toolbar.
2. Click **Run**.
3. Choose your Google account and authorize the requested Google Sheets and Google Drive access.
4. Return to the spreadsheet and refresh it if the new `Customers` sheet is not immediately visible.

Google requests authorization when the script is first run, not when it is merely saved.

### Insert and read a test row

After initialization, add these functions to `Main.gs`:

```javascript
function insertCustomer() {
  var databaseId = SpreadsheetApp.getActiveSpreadsheet().getId();

  var result = new gSQL()
    .DB(databaseId)
    .TABLE('Customers')
    .INSERT(['Ada', 'ada@example.com', true]);

  Logger.log(result);
}

function readCustomers() {
  var databaseId = SpreadsheetApp.getActiveSpreadsheet().getId();

  var rows = new gSQL()
    .DB(databaseId)
    .TABLE('Customers')
    .SELECT('ALL')
    .getVal();

  Logger.log(rows);
}
```

Run `insertCustomer`, then run `readCustomers`. Open **Execution log** in the Apps Script editor to see the returned data.

Create a fresh `gSQL` instance for each independent operation, as shown above. A `gSQL` instance keeps the selected database, table, and query state internally.

## Use an existing spreadsheet layout

An existing worksheet can be used as a table when:

- Row 1 contains the column names.
- The first column is named `ID`.
- Each data row has a numeric ID in the first column.
- The table name passed to `TABLE` exactly matches the worksheet tab name.

For example, a worksheet named `Customers` could contain:

| ID | Name | Email | Active |
|---:|---|---|---|
| 0 | Ada | ada@example.com | true |

Do not run `initializeDatabase` on a spreadsheet whose existing worksheets you need to preserve. Instead, query its existing table directly:

```javascript
function readExistingCustomers() {
  var databaseId = SpreadsheetApp.getActiveSpreadsheet().getId();

  var rows = new gSQL()
    .DB(databaseId)
    .TABLE('Customers')
    .SELECT('ALL')
    .getVal();

  Logger.log(rows);
}
```

## Option 2: Use a standalone Apps Script project

1. Open [Google Apps Script](https://script.google.com/) and create a project.
2. Put the entire contents of [`code.js`](code.js) in a file named `gSQL.gs`.
3. Create `Main.gs` for your functions.
4. Add and run the following function:

```javascript
function createDatabase() {
  var result = new gSQL()
    .CREATEDB('Customer database')
    .SETTABLES('Customers')
    .SETCOLUMNS(['Name', 'Email', 'Active']);

  Logger.log(result);
}
```

The script creates a spreadsheet named `Customer database` in Google Drive. Open that spreadsheet from Drive to view it. To use it in later operations, copy its ID from the URL:

```text
https://docs.google.com/spreadsheets/d/SPREADSHEET_ID/edit
```

Then supply that ID to `DB` inside a runnable function:

```javascript
function readStandaloneDatabase() {
  var databaseId = 'SPREADSHEET_ID';

  var rows = new gSQL()
    .DB(databaseId)
    .TABLE('Customers')
    .SELECT('ALL')
    .getVal();

  Logger.log(rows);
}
```

## Common problems

- **`gSQL is not defined`:** Confirm that the entire contents of `code.js` were copied into a `.gs` file in the same Apps Script project.
- **Table or range errors:** Confirm that the worksheet tab name exactly matches the value passed to `TABLE`, and that row 1 contains headers.
- **No function appears in the Run menu:** Put the example chain inside a named function such as `function readCustomers() { ... }` and save the project.
- **Authorization errors:** Run a named function manually from the Apps Script editor and complete the permission prompt.
- **Unexpected matches in filters:** The current version uses JavaScript's loose comparisons. Validate value types before update or delete operations.

For all available operations and examples, see the [README](README.md).
