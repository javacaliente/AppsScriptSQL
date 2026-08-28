# Understanding the GoogleScriptSQL API

GoogleScriptSQL provides a JavaScript programming interface for reading and writing spreadsheet data from Google Apps Script. It is a data-access layer, not an HTTP or REST API.

The word **API** can refer to several different layers in this project:

1. **The GoogleScriptSQL API** is the collection of chainable methods such as `DB`, `TABLE`, `SELECT`, `WHERE`, and `getVal`.
2. **The Google Apps Script service API** consists of Google's built-in objects such as `SpreadsheetApp` and `DriveApp`, which GoogleScriptSQL calls internally.
3. **An HTTP API** would expose spreadsheet operations at web URLs. GoogleScriptSQL does not currently provide this layer, although an Apps Script web app could add one.

## How the layers fit together

```text
Your Apps Script function
        |
        v
GoogleScriptSQL: DB(), TABLE(), SELECT(), WHERE(), ...
        |
        v
Apps Script services: SpreadsheetApp and DriveApp
        |
        v
Google Sheets and Google Drive
```

Your code talks to GoogleScriptSQL. GoogleScriptSQL translates those calls into operations on the Apps Script services, and those services communicate with Sheets and Drive.

## A read operation from beginning to end

```javascript
function readActiveCustomers() {
  var databaseId = SpreadsheetApp.getActiveSpreadsheet().getId();

  var customers = new gSQL()
    .DB(databaseId)
    .TABLE('Customers')
    .SELECT(['Name', 'Email'])
    .WHERE('Active', '=', true)
    .getVal();

  Logger.log(customers);
}
```

Each call has a separate responsibility:

1. `new gSQL()` creates an instance that holds the state for this operation.
2. `DB(databaseId)` stores the spreadsheet ID on that instance.
3. `TABLE('Customers')` stores the worksheet name.
4. `SELECT(['Name', 'Email'])` reads the worksheet's used range into a two-dimensional JavaScript array and records which columns should be returned.
5. `WHERE('Active', '=', true)` filters the in-memory rows.
6. `getVal()` removes the header row, selects the requested columns, and returns the resulting array.

If the worksheet contains:

| ID | Name | Email | Active |
|---:|---|---|---|
| 0 | Ada | ada@example.com | true |
| 1 | Grace | grace@example.com | false |

the result is:

```javascript
[
  ['Ada', 'ada@example.com']
]
```

Filtering happens inside the script after the complete used range has been read. GoogleScriptSQL does not send SQL text to Google Sheets, and Google Sheets does not execute a SQL query.

## Why method chaining works

Configuration methods save a value and return the current object:

```javascript
this.DB = function(dbId) {
  Db = dbId;
  return this;
};
```

Returning `this` lets the next method be called immediately:

```javascript
new gSQL().DB(databaseId).TABLE('Customers');
```

The instance keeps the selected database, table, operation type, rows, columns, and filter results in internal variables. Because that state persists, create a fresh `gSQL` instance for each independent operation.

Some terminal methods return data or a status string instead of `this`. They end the chain. Examples include `getVal`, `INSERT`, `DELETEWHERE`, `TRUNCATE`, and `setVal`.

## Read and write chains

A read chain is assembled and then completed by `getVal`:

```javascript
var rows = new gSQL()
  .DB(databaseId)
  .TABLE('Customers')
  .SELECT('ALL')
  .WHERE('Active', '=', true)
  .getVal();
```

An update chain selects target columns and replacement values, optionally filters rows, and then writes with `setVal`:

```javascript
new gSQL()
  .DB(databaseId)
  .TABLE('Customers')
  .UPDATE('Active')
  .VALUES(false)
  .WHERE('Email', '=', 'ada@example.com')
  .setVal();
```

Without a `WHERE` clause, `setVal` updates every data row in the selected columns.

`INSERT`, `DELETEWHERE`, `TRUNCATE`, `DROPTABLE`, and `DROPDB` perform their work immediately. In particular, the last three are destructive operations and should first be tested with disposable data.

## The public method groups

The public API falls into several groups:

| Group | Methods |
|---|---|
| Database and schema | `CREATEDB`, `INFOLDER`, `SETTABLES`, `SETCOLUMNS`, `INSERTCOL` |
| Select context | `DB`, `TABLE` |
| Create and read data | `INSERT`, `SELECT`, `getVal` |
| Filter data | `WHERE`, `AND`, `OR` |
| Update data | `UPDATE`, `VALUES`, `setVal` |
| Delete data | `DELETEWHERE`, `TRUNCATE`, `DROPTABLE`, `DROPDB` |
| Join data | `TAKE`, `ANDIN`, `JOINWHERE` |

See the [README API summary](README.md#api-summary) for a short description of every method and its arguments.

## Authentication and API keys

GoogleScriptSQL does not require an API key. It runs inside Google Apps Script and uses the account under which the script is executed.

When a function first attempts to access Sheets or Drive, Apps Script determines the permissions the code needs and asks the user to authorize them. Saving the source code alone does not trigger authorization.

The permissions granted to the script determine which spreadsheets and Drive files it can access. The spreadsheet ID passed to `DB` identifies a file; it does not grant access to that file.

## This is not currently a REST API

GoogleScriptSQL does not currently define:

- public URL endpoints;
- HTTP methods such as `GET`, `POST`, `PATCH`, or `DELETE`;
- JSON request and response formats;
- client authentication or authorization rules;
- API versioning, rate limits, or HTTP error responses.

Consequently, an external website or application cannot currently make a request such as:

```http
GET /customers?active=true
```

The caller must be code running within the Apps Script project.

## How an HTTP layer could be added

Apps Script web apps recognize special `doGet(e)` and `doPost(e)` entry points. A minimal read-only endpoint could call GoogleScriptSQL and return JSON:

```javascript
function doGet(e) {
  var rows = new gSQL()
    .DB(PROPERTIES_DATABASE_ID)
    .TABLE('Customers')
    .SELECT('ALL')
    .getVal();

  return ContentService
    .createTextOutput(JSON.stringify({ data: rows }))
    .setMimeType(ContentService.MimeType.JSON);
}
```

After the Apps Script project is deployed as a web app, its deployment URL becomes the endpoint. The layers would then be:

```text
Browser, mobile app, or other HTTP client
        |
        v
Apps Script web app: doGet(e) / doPost(e)
        |
        v
GoogleScriptSQL
        |
        v
Google Sheets and Google Drive
```

The example only demonstrates the architecture. A real HTTP API would also need deliberate decisions about:

- who may call it and whose Google identity it runs as;
- which database, tables, columns, and operations callers may access;
- validation of every incoming parameter and request body;
- stable JSON success and error formats;
- protection against unintended updates and deletes;
- concurrent writes and duplicate ID generation;
- Apps Script execution limits and service quotas;
- API versioning and backward compatibility.

Do not pass an arbitrary spreadsheet ID, table name, column name, or operation directly from an HTTP request into GoogleScriptSQL without validating it against an allowlist. In particular, write and destructive operations should not be exposed until authentication, authorization, validation, and error handling are defined.

## Current design constraints

GoogleScriptSQL is intended for small Apps Script projects, not as a replacement for a database server:

- A read loads the sheet's complete used range before applying filters.
- Writes are not transactional and have no concurrency control.
- Generated IDs can collide when simultaneous callers insert rows.
- Comparisons currently use JavaScript type coercion, so values such as `1` and `'1'` can match.
- Missing tables and columns are not consistently converted into friendly API errors.
- Return types vary between arrays and human-readable status strings.
- Apps Script execution time and service quotas limit workload size.

These constraints matter even more if an HTTP layer is added, because multiple remote callers can create more traffic and concurrency than a manually run Apps Script function.
