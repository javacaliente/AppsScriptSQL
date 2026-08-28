'use strict';

var assert = require('node:assert/strict');
var fs = require('node:fs');
var path = require('node:path');
var test = require('node:test');
var vm = require('node:vm');
var createAppsScriptEnvironment = require('./apps-script-mocks').createAppsScriptEnvironment;

var source = fs.readFileSync(path.join(__dirname, '..', 'code.js'), 'utf8');

function loadProject(fixtures) {
  var environment = createAppsScriptEnvironment(fixtures);
  var context = vm.createContext({
    SpreadsheetApp: environment.SpreadsheetApp,
    DriveApp: environment.DriveApp
  });
  vm.runInContext(source, context, { filename: 'code.js' });

  return {
    gSQL: context.gSQL,
    getSheet: environment.getSheet
  };
}

function plain(value) {
  return JSON.parse(JSON.stringify(value));
}

test('SELECT ALL returns an empty array for a blank sheet', function() {
  var project = loadProject({ database: { Blank: [] } });

  var values = new project.gSQL()
    .DB('database')
    .TABLE('Blank')
    .SELECT('ALL')
    .getVal();

  assert.deepEqual(plain(values), []);
});

test('SELECT returns no rows for a header-only table', function() {
  var project = loadProject({
    database: { Customers: [['ID', 'Name', 'Active']] }
  });

  var allValues = new project.gSQL()
    .DB('database')
    .TABLE('Customers')
    .SELECT('ALL')
    .getVal();
  var selectedValues = new project.gSQL()
    .DB('database')
    .TABLE('Customers')
    .SELECT(['Name', 'Active'])
    .getVal();

  assert.deepEqual(plain(allValues), []);
  assert.deepEqual(plain(selectedValues), []);
});

test('TRUNCATE is a no-op for blank and header-only sheets', function() {
  var project = loadProject({
    database: {
      Blank: [],
      Customers: [['ID', 'Name']]
    }
  });

  assert.equal(
    new project.gSQL().DB('database').TABLE('Blank').TRUNCATE(),
    'The table Blank has been emptied'
  );
  assert.equal(
    new project.gSQL().DB('database').TABLE('Customers').TRUNCATE(),
    'The table Customers has been emptied'
  );
  assert.deepEqual(project.getSheet('database', 'Blank').snapshot(), []);
  assert.deepEqual(project.getSheet('database', 'Customers').snapshot(), [['ID', 'Name']]);
});

test('updating all rows in a header-only table is a no-op', function() {
  var project = loadProject({
    database: { Customers: [['ID', 'Name']] }
  });

  var result = new project.gSQL()
    .DB('database')
    .TABLE('Customers')
    .UPDATE('Name')
    .VALUES('Nobody')
    .setVal();

  assert.equal(result, 'The values have been updated');
  assert.deepEqual(project.getSheet('database', 'Customers').snapshot(), [['ID', 'Name']]);
});

test('updating all rows still updates a populated table', function() {
  var project = loadProject({
    database: {
      Customers: [
        ['ID', 'Name', 'Active'],
        [0, 'Ada', true],
        [1, 'Grace', true]
      ]
    }
  });

  new project.gSQL()
    .DB('database')
    .TABLE('Customers')
    .UPDATE('Active')
    .VALUES(false)
    .setVal();

  assert.deepEqual(project.getSheet('database', 'Customers').snapshot(), [
    ['ID', 'Name', 'Active'],
    [0, 'Ada', false],
    [1, 'Grace', false]
  ]);
});

test('TRUNCATE still removes rows from a populated table', function() {
  var project = loadProject({
    database: {
      Customers: [
        ['ID', 'Name'],
        [0, 'Ada'],
        [1, 'Grace']
      ]
    }
  });

  new project.gSQL()
    .DB('database')
    .TABLE('Customers')
    .TRUNCATE();

  assert.deepEqual(project.getSheet('database', 'Customers').snapshot(), [['ID', 'Name']]);
});

test('the first generated ID remains zero in the legacy baseline', function() {
  var project = loadProject({
    database: { Customers: [['ID', 'Name']] }
  });

  new project.gSQL()
    .DB('database')
    .TABLE('Customers')
    .INSERT(['Ada']);

  assert.deepEqual(project.getSheet('database', 'Customers').snapshot(), [
    ['ID', 'Name'],
    [0, 'Ada']
  ]);
});

test('loose equality matches numeric cells with string filter values', function() {
  var project = loadProject({
    database: {
      Customers: [
        ['ID', 'Name'],
        [0, 'Ada'],
        [1, 'Grace']
      ]
    }
  });

  var values = new project.gSQL()
    .DB('database')
    .TABLE('Customers')
    .SELECT('ALL')
    .WHERE('ID', '=', '1')
    .getVal();

  assert.deepEqual(plain(values), [[1, 'Grace']]);
});

test('loose equality remains active for filtered updates and deletes', function() {
  var project = loadProject({
    database: {
      Customers: [
        ['ID', 'Name', 'Active'],
        [0, 'Ada', true],
        [1, 'Grace', false],
        [2, 'Zero', 0]
      ]
    }
  });

  new project.gSQL()
    .DB('database')
    .TABLE('Customers')
    .UPDATE('Name')
    .VALUES('Updated')
    .WHERE('ID', '=', '1')
    .setVal();

  new project.gSQL()
    .DB('database')
    .TABLE('Customers')
    .DELETEWHERE('Active', '=', false);

  assert.deepEqual(project.getSheet('database', 'Customers').snapshot(), [
    ['ID', 'Name', 'Active'],
    [0, 'Ada', true]
  ]);
});

test('JOINWHERE retains loose equality between join columns', function() {
  var project = loadProject({
    database: {
      Customers: [
        ['ID', 'Name'],
        [0, 'Ada'],
        [1, 'Grace']
      ],
      Orders: [
        ['CustomerID', 'Total'],
        ['0', 25],
        [1, 40]
      ]
    }
  });

  var values = new project.gSQL()
    .DB('database')
    .TABLE('Customers')
    .TAKE(['ID', 'Name'])
    .ANDIN('Orders')
    .TAKE(['CustomerID', 'Total'])
    .JOINWHERE('ID', '=', 'CustomerID');

  assert.deepEqual(plain(values), [
    [0, 'Ada', '0', 25],
    [1, 'Grace', 1, 40]
  ]);
});
